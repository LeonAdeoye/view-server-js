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
          animateRows={true}
          filter="LENGTH(/symbol) = 3"
          showFilterBar={true}
          width={450}
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
          animateRows={false}
          select={true}
          delta={true}
          width={450}
      />
      <Grid
        title="Aggregated Market Data"
        showFilterBar={false}
        columnDefs={[
            {headerName: 'Group', field: 'group', sort: 'asc'},
            curCol({headerName: 'Bid Total', field: 'bid_total'}),
            curCol({headerName: 'Ask Total', field: 'ask_total'}),
            {headerName: 'Symbols in Group', field: 'count'}
        ]}
        client={client}
        topic="agg_market_data"
        options="oof,conflation=3000ms"
      />
      <Grid
        title="Market Data - spreads"
        width={250}
        showFilterBar={false}
        columnDefs={[
            {headerName: 'Symbol', field: 'symbol', sort: 'asc'},
            curCol({headerName: 'Spread', field: 'spread'})
        ]}
        client={client}
        topic="market_data"
        options="oof,conflation=3000ms,
         grouping=[/symbol],
         projection=[
            /symbol,
            (/ask - /bid) AS /spread
         ]"
      />
    </div>
  );
}

export default App;
