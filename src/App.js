import Grid from './Grid';
import './App.css';
import { Client, DefaultServerChooser, DefaultSubscriptionManager } from 'amps';
import {useEffect, useState} from "react";

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
    client.connect().then(() =>
    {
      setClient(client);
      console.log("Connected to AMPS");
    });
    return () =>
    {
      client.disconnect().then(() => console.log("Client disconnected."));
    }

  }, [])

  if(!client)
    return (<div>Loading stock prices...</div>);

  return (<Grid client={client}/>);
}

export default App;
