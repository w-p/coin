const gdax = require('gdax');
var program = require('commander');
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
    term(`update: ${interval}s history: ${rows * interval}s`)

    y += 1;
    term.moveTo(1, y);
    term(`ticker: ${ticker} price: ${last_price} hi: ${high_price} lo: ${low_price}`);

    y += 2;
    term.moveTo(1, y);
    term('timestamp');
    term.moveTo(col_width, y);
    term('price');

    y += 1;
    price_history
        .slice(rows - 15, rows)
        .forEach((price, index) => {
            term.moveTo(1, y);
            term(Date.now());
            term.moveTo(col_width, y);
            term(price);
            y += 1;
        });
}

function log(msg) {
    term.moveTo(1, 20);
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
            last_price = price;
            price_history.push(price);
            if (min_period <= 0) {
                price_history.shift();
            }
        });
}

function calculate_limits() {
    low_price = Math.min(...price_history);
    high_price = Math.max(...price_history);
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
