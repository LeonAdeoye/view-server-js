import Grid from './Grid';
import './App.css';
import { Client, DefaultServerChooser, DefaultSubscriptionManager } from 'amps';
import {useEffect, useState} from "react";
import { curCol } from './grid-helpers';

const App = () =>
{
  const [client, setClient] = useState(null);

  useEffect(() =>
  {
    const chooser = new DefaultServerChooser();
    chooser.add(`ws://localhost:9008/amps/json`);
    const client = new Client("view-server");
    client.serverChooser(chooser);
    client.subscriptionManager(new DefaultSubscriptionManager());
    client.connect().then(() => setClient(client));
    return () =>
    {
      client.disconnect().then(() => console.log("Client disconnected."));
    }

  }, [])

  if(!client)
    return (<div>Loading stock prices...</div>);

  return (
    <div id="grid-parent">
      <Grid
          title="Top Symbols Sorted by BID"
          client={client}
          columnDefs={[
            {headerName: 'Symbol', field: 'symbol'},
            curCol({headerName: 'Bid', field: 'bid', sort: 'desc'}),
            curCol({headerName: 'Ask', field: 'ask'})
          ]}
          topic="market_data"
          options="oof,conflation=3000ms,top_n=20,skip_n=0"
          orderBy="/bid DESC"
          animateRows={true}
          filter="LENGTH(/symbol) = 3"
          showFilterBar={true}
      />
      <Grid
          title="Top Symbols Sorted by Symbol"
          client={client}
          columnDefs={[
            {headerName: 'Symbol', field: 'symbol', sort: 'asc'},
            curCol({headerName: 'Bid', field: 'bid'}),
            curCol({headerName: 'Ask', field: 'ask'})
          ]}
          topic="market_data"
          options="oof,conflation=1000ms"
          orderBy="/symbol ASC"
          animateRows={false}
      />
    </div>
  );
}

export default App;
