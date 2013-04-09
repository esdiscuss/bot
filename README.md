# pipermail-bot

  The esdiscuss bot.  Could also be used with any other pipermail source.

## Installation

    $ npm install pipermail-bot
    $ npm install pipermail-bot -g

## API

```javascript
var bot = require('pipermail-bot');

bot(options).pipe(stringify()).pipe(process.stdout);
```

Options:

 - source - The pipermail source (default: 'https://mail.mozilla.org/pipermail/es-discuss/')
 - age - Max age of messages to consider (default: infinite)
 - organisation - The organisation messages are saved to (if present, will filter messages to only show those that don't exist)
 - dryRun - Don't commit new messages to repositories
 - user - The username for a GitHub account to commit with
 - pass - The password for a GitHub account to commit with
 - team - The team to give access to newly created repositories

## Command Line

Usage:

    $ pipermail-bot --help
    $ pipermail-bot --user <USER> --pass <PASSWORD> --db <USER>:<PASSWORD>@ds031617.mongolab.com:31617/esdiscuss

## License

  MIT

  If you find it useful, a donation via [gittip](https://www.gittip.com/ForbesLindesay) would be appreciated.

![viewcount](https://viewcount.jepso.com/count/esdiscuss/bot.png)