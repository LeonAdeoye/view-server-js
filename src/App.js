import Grid from './Grid';
import './App.css';
import {useState} from "@types/react";
import { Client, DefaultServerChooser, DefaultSubscriptionManager } from 'amps';
import {useEffect} from "react";

const App = () =>
{
  const HOST = "localhost";
  const PORT = "9008";
  const [client, setClient] = useState(null);

  if(!client)
    return (<div>Loading...</div>);

  useEffect(() =>
  {
    const chooser = new DefaultServerChooser();
    chooser.add(`ws://${HOST}:${PORT}/amps/json`);
    const client = new Client("view-server");
    client.serverChooser(chooser);
    client.subscriptionManager(new DefaultSubscriptionManager());
    client.connect().then(() => setClient(client));

    return () =>
    {
      client.disconnect().then(() => console.log("Client disconnected."));
    }

  }, [])

  return (<Grid client={client}/>);
}


export default App;
