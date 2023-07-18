const { Client, DefaultServerChooser, MemoryPublishStore } = require('amps');

// constants
const HOST = 'localhost';
const PORT = '9008';
const TOPIC = 'market_data';
const PUBLISH_RATE_PER_SECOND = 2000;


// -- the next part of the file is concerned with
//    creating interesting sample data

const SYMBOLS = [
    'MMM', 'ABBV', 'ALV', 'GOOGL', 'AMZN', 'AMGN', 'ABI', 'APPL', 'BHP', 'BA', 'BP',
    'BATS', 'CVX', 'CSCO', 'C', 'KO', 'DD', 'XOM', 'FB', 'GE', 'GSK', 'HSBA', 'INTC',
    'IBM', 'JNJ', 'JPM', 'MA', 'MCD', 'MRK', 'MSFT', 'NESN', 'NOVN', 'NVDA', 'ORCL',
    'PEP', 'PFE', 'PM', 'PG', 'ROG', 'RY', 'RDSA', 'SMSN', 'SAN', 'SIE', 'TSM', 'TOT',
    'V', 'WMT', 'DIS'
];


// helper functions
// Math.random() returns a random number between 0 (inclusive),  and 1 (exclusive)
const randInt = (min, max) => Math.floor((Math.random() * (max - min + 1)) + min);

// The round function rounds a number to a specified number of digits.
const round = (value, digits) => Math.round((value + Number.EPSILON) * Math.pow(10, digits)) / Math.pow(10, digits);
// The timer function returns a promise that resolves after a specified interval.
const timer = async interval => new Promise(resolve => setTimeout(resolve, interval));


// create initial prices
const pricing = {};
SYMBOLS.map(symbol => pricing[symbol] = randInt(100, 1200));


// make an update message that is plausible enough to be
// interesting

const makeMessage = () =>
{
    // calculate update before pacing, for faster rates
    const symbol = SYMBOLS[randInt(0, SYMBOLS.length - 1)];
    let lastPrice = pricing[symbol];
    const bid = round(lastPrice - 0.5, 2);
    const ask = round(lastPrice + 0.5, 2);

    // keep market prices larger so that adjustments are proportionally accurate
    if (lastPrice < 100)
    {
        lastPrice = 100.0;
    }
    else if (lastPrice > 1200)
    {
        lastPrice = 1200.0;
    }

    // bump up to a nickle on each adjustment
    pricing[symbol] = round(lastPrice + randInt(-5, 5) / 100.0, 2);

    return { symbol, bid, ask };
};

// connect to AMPS and publish the data

const publishMarketData = async () =>
{
    // publish indefinitely at the rate specified.
    // if the rate is 2000, then the publish rate is 1 message every 2 seconds.
    const rate = 1.0 / PUBLISH_RATE_PER_SECOND * 1000;

    // create the server chooser
    const chooser = new DefaultServerChooser();
    chooser.add(`ws://${HOST}:${PORT}/amps/json`)

    // create the HA publisher and connect
    const client = new Client('market_data_publisher');
    client.serverChooser(chooser);
    // The publish store is responsible for storing published messages before they are sent to the server.
    // By using a publish store, the client can buffer messages and manage their delivery to the server more efficiently.
    // The MemoryPublishStore class is a memory-based implementation, meaning it stores the published messages in memory.
    // t provides methods to store messages and retrieve them for publishing. It allows the client to store messages in memory before they are sent to the server.
    client.publishStore(new MemoryPublishStore());

    try {
        await client.connect();

        //  initializes a variable with the current timestamp in milliseconds.
        let lastTick = new Date().getTime();

        while (true)
        {

            const nextTick = lastTick + rate;
            client.publish(TOPIC, makeMessage());

            // pace yourself to maintain the publish rate
            while (new Date().getTime() < nextTick)
            {
                await timer(0.01);
            }

            lastTick = nextTick;
        }
    }
    catch (err) {
        console.error('err: ', err.message.reason);
        client.disconnect();
    }
};


// if running a script
if (typeof require !== 'undefined' && require.main === module) {
    publishMarketData();
}
// if used as a module
module.exports = { publishMarketData };
