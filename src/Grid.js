import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {useCallback, useEffect, useRef, useState} from "react";
import {Command, Client} from "amps";
import FilterBar from './FilterBar';

// In both cases we try to find the index of the existing row by using a matcher:
const matcher = ({ header }) => ({ key }) => key === header.sowKey();

// When AMPS notifies us that a message is no longer relevant, we remove that message from the grid.
// The processOOF function is declared outside the Grid component.
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
// the processPublish function is declared outside the Grid component,
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

const Grid = ({ title, client, width, height, columnDefs, topic, orderBy, options, animateRows, filter, showFilterBar}) =>
{
    const [rowData, setRowData] = useState([]);
    const [worker, setWorker] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Connected');
    const [error, setError] = useState('');
    const subIdRef = useRef(null);

    // new filter state value hook
    const [filterInput, setFilterInput] = useState(filter || '');

    const sowAndSubscribe = useCallback(async filter =>
    {
        if (filter !== undefined)
        {
            if (filter !== filterInput)
                setFilterInput(filter || '');
            else
                return;
        }
        else
            filter = filterInput;

        // clear previous errors, if any
        if (error)
            setError('');

        // if we had a running subscription already, we need to unsubscribe from it
        if (subIdRef.current)
        {
            client.unsubscribe(subIdRef.current);
            subIdRef.current = undefined;
            // update state
            setRowData([]);
        }

        // create a command object
        const command = new Command('sow_and_subscribe');
        command.topic(topic);
        command.orderBy(orderBy);
        command.options(options);

        if (filter)
            command.filter(filter);

        try
        {
            // subscribe to the topic data and atomic updates
            let rows;
            subIdRef.current = await client.execute(command, message =>
            {
                switch (message.header.command()) {
                    case 'group_begin': // Begin receiving the initial dataset
                        rows = [];
                        break;
                    case 'sow': // This message is a part of the initial dataset
                        message.data.key = message.header.sowKey();
                        rows.push(message.data);
                        break;
                    case 'group_end': // Initial Dataset has been delivered
                        setRowData(rows);
                        break;
                    case 'oof': // Out-of-Focus -- a message should no longer be in the grid
                        rows = processOOF(message, rows);
                        setRowData(rows);
                        break;
                    default: // Publish -- either a new message or an update
                        rows = processPublish(message, rows);
                        setRowData(rows);
                }
            });
        }
        catch (err)
        {
            setError(`Error: ${err.message}`);
        }
    }, [client, error, filterInput, options, orderBy, topic]);

    useEffect(() =>
    {
        const web_worker = new Worker(new URL("./market-data.js", import.meta.url));
        setWorker(web_worker);
        return () => web_worker.terminate();
    }, []);

    useEffect(() =>
    {
        const listenerId = client.addConnectionStateListener(state =>
        {
            if (state === Client.ConnectionStateListener.LoggedOn)
            {
                setConnectionStatus('Connected');
            }
            else if (state === Client.ConnectionStateListener.Disconnected)
            {
                setRowData([]);
                setConnectionStatus('Disconnected');
            }
        });

        return () =>
        {
            client.removeConnectionStateListener(listenerId);
        };
    }, [client]);

    return (
        <div className="ag-theme-alpine-dark" style={{height: height ?? 750, width: width ?? 900}}>
            <div className="grid-header">{title}</div>
            {showFilterBar && <FilterBar value={filterInput} onValueChange={sowAndSubscribe} />}
            <AgGridReact columnDefs={columnDefs} animateRows={animateRows}
                // we now use state to track row data changes
                 rowData={rowData}
                // unique identification of the row based on the SowKey
                 getRowId={({data: { key }}) => key}
                // resize columns on grid resize
                 onGridSizeChanged={({ api }) => api.sizeColumnsToFit()}

                // provide callback to invoke once grid is initialised.
                onGridReady={ async (api) =>
                {
                    await sowAndSubscribe();
                }}
            />
            <div className="status-panel">
                <span style={{color: connectionStatus === 'Connected' ? 'green' : 'yellow'}}>{connectionStatus}</span>
                <span style={{float: 'right', color: 'red'}}>{error}</span>
            </div>
        </div>
    );
};

export default Grid
