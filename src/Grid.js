import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {useEffect, useState, useRef} from "react";
import {Command} from "amps";

const columnDefs = [
    {headerName: 'Symbol', field: 'symbol'},
    {headerName: 'Bid', field: 'bid'},
    {headerName: 'Ask', field: 'ask'}
];

const Grid = ({client}) =>
{
    const [rowData, setRowData] = useState([]);
    // Keep a reference to the subscription ID.
    const subIdTef = useRef();

    useEffect(() =>
    {
        return () =>
        {
            // If there is an active subscription at the time of subscription then remove it.
            if(subIdTef.current)
                client.unsubscribe(subIdTef.current);
        }
    }, [client]);

    const processOOF = (message, rowData) =>
    {

    }

    const processPublish = (message, rowData) =>
    {

    }

    return (
        <div className="ag-theme-alpine" style={{height: 400, width: 600}}>
            <AgGridReact

                // provide callback to invoke once grid is initialised.
                onGridReady={ async (api) =>
                {
                    // resize columns to fit the width of the grid.
                    api.sizeColumnsToFit();

                    const command = new Command('sow_and_subscribe');
                    command.topic('market_data');
                    command.orderBy('/bid DESC');
                    command.options('oof, conflation=3000ms, top_n=20, skip_n=0');

                    try
                    {
                        let rows;
                        subIdTef.current = await client.execute(command, message =>
                        {
                            switch(message.header.command())
                            {
                                // Begin receiving the initial dataset.
                                case 'group_begin':
                                    rows = [];
                                    break;
                                // This message is part of the initial snapshot.
                                case 'sow':
                                    message.data.key = message.header.sowKey();
                                    rows.push(message.data);
                                    break;
                                // Thr initial snapshot has been delivered.
                                case 'group_end':
                                    setRowData(rows);
                                    break;
                                // Out-of-focus -- a mesaged should no longer be in the group.
                                case 'oof':
                                    rows = processOOF(message, rows);
                                    setRowData(rows);
                                    break;
                                // Either a new message or an update.
                                default:
                                    rows = processPublish(message, rows);
                                    setRowData(rows);
                            }
                        });
                    }
                    catch(err)
                    {
                        setRowData([]);
                        console.error('Error: ' + err);
                    }
                }}
                columnDefs={columnDefs}
            />
        </div>
    );
};

export default Grid
