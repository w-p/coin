const gdax = require('gdax');
var program = require('commander');
var dateformat = require('dateformat');
var term = require('terminal-kit').terminal;

program
  .version('0.1.0')
  .option('-k, --key <key>', 'GDAX key')
  .option('-s, --secret <secret>', 'GDAX secret')
  .option('-p, --passphrase <passphrase>', 'GDAX passphrase')
  .option('-t, --ticker [ticker]', 'BTC-USD, ETH-USD, etc', 'ETH-USD')
  .option('-i, --interval [interval]', 'update interval in seconds', 5)
  .option('-h, --history [history]', 'total history torecord in seconds', 900)
  .parse(process.argv);

if (!program.key || !program.secret || !program.passphrase) {
    console.log('A GDAX API key, secret, and passphrase are required.');
    program.help();
}

// gdax credentials
const key = program.key;
const secret = program.secret;
const passphrase = program.passphrase;

// settings
const interval = +program.interval;
var min_period = +program.history;
const ticker = program.ticker.toUpperCase();
const uri = 'https://api.gdax.com';
const wsuri = 'wss://ws-feed.gdax.com';


const client = new gdax.AuthenticatedClient(key, secret, passphrase, uri);
var buy_price = null;
var sell_price = null;
var high_price = null;
var low_price = null;
var last_price = null;
var price_history = [];
var task = null;

function render() {
    term.clear();
    var rows = price_history.length;
    var col_width = 20;
    var y = 0;

    y += 1;
    term.moveTo(1, y);
    term(`update:  ${interval}s`);

    y += 1;
    term.moveTo(1, y);
    term(`showing: ${rows * interval}s`);

    y += 1;
    term.moveTo(1, y);
    term(
        `ticker:  ${ticker} ` +
        `price: ${last_price.toFixed(2)} ` +
        `hi: ${high_price.toFixed(2)} ` +
        `lo: ${low_price.toFixed(2)}`
    );

    y += 2;
    term.moveTo(1, y);
    term('timestamp');
    term.moveTo(col_width, y);
    term('price');

    y += 1;
    var start = rows > 15 ? rows - 15 : 0;
    price_history
        .slice(start, rows)
        .forEach((row, index) => {
            term.moveTo(1, y);
            term(row.timestamp);
            term.moveTo(col_width, y);
            term(row.price.toFixed(2));
            y += 1;
        });
}

function log(msg) {
    term.moveTo(1, 22);
    msg = `[notice] ${msg}`;
    term(msg);
}

function round(num) {
    return +(Math.round(num + 'e+2') + 'e-2');
}

function get_price() {
    return client.getProductTicker(ticker)
        .then(res => {
            var price = round(res.price);
            var date = dateformat(new Date(), 'dd-mm-yy hh:MM:ss');
            last_price = price;
            price_history.push({
                price: price,
                timestamp: date
            });
            if (min_period <= 0) {
                price_history.shift();
            }
        });
}

function calculate_limits() {
    var prices = price_history.map((p) => {
        return p.price;
    });
    low_price = Math.min(...prices);
    high_price = Math.max(...prices);
}

function main() {
    get_price()
        .then(() => {
            calculate_limits();
            if (min_period > 0) {
                min_period -= interval;
            }
            render();
        })
        .catch(err => {
            log(`error: ${err}`);
        });
}

function exit() {
    log('terminated, exiting');
    if (task) {
        clearInterval(task);
    }
    console.log('\n');
    process.exit(0);
}

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
task = setInterval(main, interval * 1000);
