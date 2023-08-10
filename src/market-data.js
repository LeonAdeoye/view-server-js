const { Client, DefaultServerChooser, MemoryPublishStore } = require('amps');

const HOST = 'localhost';
const PORT = '9008';
const TOPIC = 'market_data';
const PUBLISH_RATE_PER_SECOND = 2000;

const SYMBOLS = [
    'MMM', 'ABBV', 'ALV', 'GOOGL', 'AMZN', 'AMGN', 'ABI', 'APPL', 'BHP', 'BA', 'BP',
    'BATS', 'CVX', 'CSCO', 'C', 'KO', 'DD', 'XOM', 'FB', 'GE', 'GSK', 'HSBA', 'INTC',
    'IBM', 'JNJ', 'JPM', 'MA', 'MCD', 'MRK', 'MSFT', 'NESN', 'NOVN', 'NVDA', 'ORCL',
    'PEP', 'PFE', 'PM', 'PG', 'ROG', 'RY', 'RDSA', 'SMSN', 'SAN', 'SIE', 'TSM', 'TOT',
    'V', 'WMT', 'DIS'
];

// The randInt function returns a random integer value between min and max arguments.
// Math.random() returns a random number between 0 (inclusive),  and 1 (exclusive).
const randInt = (min, max) => Math.floor((Math.random() * (max - min + 1)) + min);

// The round function rounds a number to a specified number of decimal places.
const round = (value, digits) => Math.round((value + Number.EPSILON) * Math.pow(10, digits)) / Math.pow(10, digits);

// The timer function returns a promise that resolves after a specified interval.
const timer = async interval => new Promise(resolve => setTimeout(resolve, interval));

// Create initial prices
const pricing = {};
SYMBOLS.map(symbol => pricing[symbol] = randInt(100, 1200));

let count = 0

// The purpose of this function is to generate a plausible update message for market data with adjusted prices.
// It randomly selects a symbol, calculates bid and ask prices based on the last price,
// adjusts the prices within a certain range, and returns the symbol along with the bid and ask values as an object.
const makeMessage = () =>
{
    // symbol is assigned a randomly selected symbol from the SYMBOLS array.
    // randInt(0, SYMBOLS.length - 1) generates a random index to access a symbol from the array.
    // lastPrice is assigned the price associated with the randomly selected symbol from the pricing object.
    // bid is calculated as the lastPrice minus 0.5, rounded to 2 decimal places using the round function.
    // ask is calculated as the lastPrice plus 0.5, rounded to 2 decimal places using the round function.
    const symbol = SYMBOLS[randInt(0, SYMBOLS.length - 1)];
    let lastPrice = pricing[symbol];
    const bid = round(lastPrice - 0.5, 2);
    const ask = round(lastPrice + 0.5, 2);

    // keep market prices larger so that adjustments are proportionally accurate.
    // The next section ensures that the lastPrice stays within a certain range.
    // If lastPrice is less than 100, it is set to 100.0. If it is greater than 1200, it is set to 1200.0.
    // This keeps the market prices within a specific range for accurate adjustments.
    if (lastPrice < 100)
    {
        lastPrice = 100.0;
    }
    else if (lastPrice > 1200)
    {
        lastPrice = 1200.0;
    }

    // The pricing object is updated with a new price for the symbol.
    // randInt(-5, 5) / 100.0 generates a random value between -0.05 and 0.05 (representing a change in price of 5 cents/nickel),
    // which is added to the lastPrice after rounding to 2 decimal places using the round function.
    // randInt(-5, 5) generates a random integer between -5 and 5 (inclusive). Let's say the generated value is 3.
    // randInt(-5, 5) / 100.0 divides the generated value (3) by 100.0, resulting in 0.03.
    // lastPrice + randInt(-5, 5) / 100.0 adds the result from step 2 (0.03) to the lastPrice (1200), resulting in 1200.03.
    // round(lastPrice + randInt(-5, 5) / 100.0, 2) rounds the result from step 3 (1200.03) to 2 decimal places using the round function.
    // Let's assume the rounded value is 1200.03.
    // Finally, pricing[symbol] updates the pricing object by assigning the rounded value (1200.03) to the last price property with the key symbol ('GOOGL').
    // If the pricing object already had an entry for the 'GOOGL' symbol, it would be overwritten with the new value.
    // If it didn't have an entry, a new property would be added to the pricing object.
    pricing[symbol] = round(lastPrice + randInt(-5, 5) / 100.0, 2);

    if(count++ <= 20)
        console.log("symbol: " + symbol + ", bid: " + bid + ", ask: " + ask);

    return { symbol, bid, ask };
};



// connect to AMPS and publish the data
const publishMarketData = async () =>
{
    const client = new Client("web-trader-price-reader");

    // publish indefinitely at the rate specified.
    // if the rate is 2000, then the publishing rate is 1 message every 2 seconds.
    const rate = 1.0 / PUBLISH_RATE_PER_SECOND * 1000; // 1/2000 * 1000 = 0.5

    // create the server chooser
    const chooser = new DefaultServerChooser();
    chooser.add(`ws://${HOST}:${PORT}/amps/json`)

    // create the HA publisher and connect
    //const client = new Client('market_data_publisher');
    client.serverChooser(chooser);
    // The publishing store is responsible for storing published messages before they are sent to the server.
    // By using a publishing store, the client can buffer messages and manage their delivery to the server more efficiently.
    // The MemoryPublishStore class is a memory-based implementation, meaning it stores the published messages in memory.
    // It provides methods to store messages and retrieve them for publishing. It allows the client to store messages in memory before they are sent to the server.
    client.publishStore(new MemoryPublishStore());

    try
    {
        await client.connect();
        //  initializes a variable with the current timestamp in milliseconds.
        let lastTick = new Date().getTime();

        // The loop is set to run indefinitely. This ensures that the publishing process continues until interrupted or stopped manually.
        // const nextTick = lastTick + rate; calculates the timestamp of the next tick or iteration by adding the rate to the lastTick timestamp.
        // The rate variable represents the duration between each tick in milliseconds.
        // client.publish(TOPIC, makeMessage()); publishes a message to the specified TOPIC using the client.publish() function.
        // The makeMessage() function generates the message content.
        // The nested while loop is used to control the pacing of the publishing process.
        // It ensures that the time spent between ticks corresponds to the desired rate.
        // while (new Date().getTime() < nextTick) compares the current timestamp with the nextTick timestamp.
        // It repeatedly checks if the current time is less than the nextTick time, effectively introducing a delay until the next tick.
        // await timer(0.01); suspends the execution of the loop for a very short interval (0.01 milliseconds) using the timer() function.
        // This allows the loop to pause briefly between each iteration to maintain the desired publish rate.
        // After the inner while loop completes, lastTick = nextTick; updates the lastTick variable with the value of nextTick,
        // indicating that the next iteration should be based on this new timestamp.
        while (true)
        {
            const nextTick = lastTick + rate;
            client.publish(TOPIC, makeMessage());

            // pace yourself to maintain the publishing rate
            while (new Date().getTime() < nextTick)
            {
                await timer(0.01);
            }

            lastTick = nextTick;
        }
    }
    catch (err)
    {
        console.error('err: ', err.message);
        await client.disconnect();
    }
};

publishMarketData().then(() => console.log('Completed publishing market data'));

