var util = require('util');
var inspect = require('util').inspect;
var extend = util._extend;
var stream = require('stream');
var nodemailer = require('nodemailer');

var Stream = stream.Writable || stream.Stream;

// Levels
var LEVELS = {
    10: 'TRACE',
    20: 'DEBUG',
    30: 'INFO',
    40: 'WARN',
    50: 'ERROR',
    60: 'FATAL',
};

/**
 * Convert level integer to level name string
 */
function levelName(level) {
    return LEVELS[level] || 'LVL' + level;
}

exports.EmailStream = EmailStream;
exports.formatSubject = formatSubject;
exports.formatBody = formatBody;

function EmailStream(mailOptions, transportOptions) {
    Stream.call(this);
    this.writable = true;

    this._mailOptions = extend({}, mailOptions);

    this._transportOptions = extend({}, transportOptions);

    this._transportType = this._transportOptions.type &&
        this._transportOptions.type.toUpperCase() ||
        'SENDMAIL';

    delete this._transportOptions.type;

    this._transport = nodemailer.createTransport(this._transportType, this._transportOptions);

    this.formatSubject = exports.formatSubject;
    this.formatBody = exports.formatBody;
}

util.inherits(EmailStream, Stream);

EmailStream.prototype.write = function (log) {
    var self = this;
    var message = extend({}, this._mailOptions);

    if (! message.subject) {
        message.subject = this.formatSubject(log);
    }
    message.text = this.formatBody(log);

    this._transport.sendMail(message, function (err, response) {
        if (err) {
            self.emit('error', err);
        } else {
            self.emit('mailSent', response);
        }
    });
};

EmailStream.prototype.end = function () {
    if (this._transport) {
        this._transport.close();
    }
};

function formatSubject(log) {
    var env = process.env.NODE_ENV;
    if(env) {
      env = env.toUpperCase();
    } else {
      env = "NOENV";
    }
    return util.format(
        '[%s-%s] %s on %s',
        env,
        levelName(log.level),
        log.app,
        log.hostname
    );
}

function formatBody(log) {
    var rows = [];
    rows.push('* app: ' + log.app);
    rows.push('* hostname: ' + log.hostname);
    rows.push('* pid: ' + log.pid);
    rows.push('* time: ' + log.time);

    if (log.msg) {
        rows.push('* msg: ' + log.msg);
    }

    if (log.err) {
        rows.push('* err: ' + log.err);
    }

    if (log.err && log.err.stack) {
        rows.push('* err.stack: ' + log.err.stack);
    }

    if(log.src) {
      rows.push('* src: ' + inspect(log.src,false,100));
    }

    return rows.join('\n');
}
