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

// In both cases we try to find the index of the existing row by using a matcher:
const matcher = ({ header }) => ({ key }) => key === header.sowKey();

// When AMPS notifies us that a message is no longer relevant, we remove that message from the grid.
// The processOOF function is declared outside of the Grid component.
// Its main purpose to take an OOF message with current row data, and return new, adjusted row data:
const processOOF = (message, rowData) =>
{
    const rowIndex = rowData.findIndex(matcher(message));
    if(rowIndex >= 0)
    {
        const rows = rowData.filter(({ key }) => key !== message.header.sowKey());
        return rows;
    }
    return rowData;
}

// On the other side, when AMPS notifies us that new information has arrived,
// we use the data in that message to update the grid. Similar to processOOF,
// the processPublish function is declared outside of the Grid component,
// takes a message and current row data and returns new row data:
const processPublish = (message, rowData) =>
{
    const rowIndex = rowData.findIndex(matcher(message));
    const rows = rowData.slice();
    if(rowIndex >= 0)
    {
        rows[rowIndex] = { ...rows[rowIndex], ...message.data };
    }
    else
    {
        message.data.key = message.header.sowKey();
        rows.push(message.data);
    }
    return rows;
}

const Grid = ({client}) =>
{
    const [rowData, setRowData] = useState([]);
    const [worker, setWorker] = useState(null);
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

    useEffect(() =>
    {
        const web_worker = new Worker(new URL("./market-data.js", import.meta.url));
        setWorker(web_worker);
        return () => web_worker.terminate();
    }, []);

    return (
        <div className="ag-theme-alpine" style={{height: 400, width: 600}}>
            <AgGridReact

                // provide callback to invoke once grid is initialised.
                onGridReady={ async (api) =>
                {
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
                                // Out-of-focus -- a message should no longer be in the group.
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
