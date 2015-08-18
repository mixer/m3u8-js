var Track = require('./track');

var STATE = Object.freeze({
    READING: 0,
    ADD_FILE: 1,
});

/**
 * Returns whether the string starts with a substring.
 * @param  {String} string
 * @param  {String} sub
 * @return {Boolean}
 */
function startsWith (string, sub) {
    return string.slice(0, sub.length) === sub;
}

var matchers = {
    // "Lines are terminated by either a single LF character or a CR
    // character followed by an LF character."
    // https://tools.ietf.org/html/draft-pantos-http-live-streaming-07#section-3.1
    lineDelimiter: /\r?\n/,

    // Prefix for tag lines.
    // https://tools.ietf.org/html/draft-pantos-http-live-streaming-07#section-3.1
    tagPrefix: '#EXT',

    // Header tag to define extended M3U8
    extensionHeader: '#EXTM3U',

    // Tag to start a track extension.
    track: '#EXTINF',

    // Parses parts out of a track extension
    trackParse: /^#EXTINF: *([0-9\.]+)(, *(.+?)?)?$/,

    // Parses an extension flag
    tagParse: /^#EXT-X-([A-Z-]+)(:(.+))?$/,

    // Returns whether the line is a comment
    // https://tools.ietf.org/html/draft-pantos-http-live-streaming-07#section-3.1
    isComment: function (line) {
        return line[0] === '#' && !startsWith(line, matchers.tagPrefix);
    },

    // Returns whether the line is blank.
    isBlank: function (line) {
        return line === '';
    },

    // Returns if the line can safely be stripped.
    canStrip: function (line) {
        return matchers.isBlank(line) || matchers.isComment(line);
    },
};

/**
 * A ParseError is thrown when invalid M3U8 data is provided.
 */
function ParseError (message) {
    Error.call(this);
    this.message = message;
}
ParseError.prototype = Object.create(Error.prototype);

/**
 * @param  {Boolean} condition
 * @param  {String} message
 * @throws {ParseError} If the condition is not true
 */
function passert (condition, message) {
    if (!condition) {
        throw new ParseError(message);
    }
}

function Parser () {
}

/**
 * Reads out a track definition from the line.
 * @param  {String} line
 */
Parser.prototype.readTrack = function (line) {
    var parsed = matchers.trackParse.exec(line);
    passert(parsed !== null, 'Line format invalid for track "' + line + '"');

    var duration = parseFloat(parsed[1], 10);
    passert(!isNaN(duration), 'Invalid track duration ' + parsed[1]);
    var name = parsed[3];

    if (duration % 1 !== 0) {
        passert(
            this.tags.VERSION >= 3,
            'Version must be 3 or higher to support floating point durations.'
        );
    }

    passert(duration < this.tags.TARGETDURATION, 'Segment duration must ' +
        'be less than the TARGETDURATION');

    this.lastTrack = new Track(duration, name, this.discontinuous);
    this.discontinuous = false;
    this.state = STATE.ADD_FILE;
};

/**
 * Reads out a tag definition from the line.
 * @param  {String} line
 */
Parser.prototype.readTag = function (line) {
    var parsed = matchers.tagParse.exec(line);
    passert(parsed !== null, 'Line format invalid for tag "' + line + '"');

    return { name: parsed[1], value: parsed[3] };
};

/**
 * Reads a line in standard mode.
 * @param  {String} line
 */
Parser.prototype.read = function (line) {
    if (startsWith(line, matchers.track)) {
        return this.readTrack(line);
    }

    var tag = this.readTag(line);

    switch (tag.name) {
    case 'VERSION':
        passert(this.tags.VERSION === undefined, 'Version may only be defined once');
        this.tags.VERSION = parseInt(tag.value, 10);
        passert(!isNaN(this.tags.VERSION), 'Invalid version tag value ' + tag.value);
        break;
    case 'TARGETDURATION':
        this.tags.TARGETDURATION = parseInt(tag.value, 10);
        passert(!isNaN(this.tags.TARGETDURATION),
            'Invalid target dureation tag value ' + tag.value);
        break;
    case 'DISCONTINUITY':
        this.discontinuous = true;
        break;
    default:
        // ignore, incomplete implementation
    }
};

/**
 * Expects to read a file from the line and add it to the last track.
 * @param {String} line
 */
Parser.prototype.addFile = function (line) {
    if (line[0] === '#') {
        var tag = this.readTag(line);
        switch (tag.name) {
        case 'PROGRAM-DATE-TIME':
            var time = new Date(tag.value);
            passert(time.toString !== 'Invalid Date', 'Invalid date ' + tag.value);
            this.lastTrack.setTime(time);
            break;
        default:
            passert(false, 'Invalid tag ' + tag.name + ', expecting media segment.');
        }

        return;
    }

    this.lastTrack.setFile(line);
    this.tracks.push(this.lastTrack);
    this.state = STATE.READING;
};

/**
 * Attempts to parse the string content.
 * @param  {String} content
 * @return {Object}
 * @throws {ParseException} If there's an error in the file
 */
Parser.prototype.parse = function (content) {
    if (!content) {
        throw new ParseError('m3u8-js cannot parse ' +
            (content === '' ? '""' : content));
    }

    this.tracks = [];
    this.tags = {};
    this.state = STATE.READING;
    this.discontinuous = false;

    var lines = content.split(matchers.lineDelimiter);
    passert(lines[0] === matchers.extensionHeader, 'm3u8-js: the ' +
            matchers.extensionHeader + ' must be the first line in the file.');

    for (var i = 1; i < lines.length; i++) {
        var line = lines[i];
        if (matchers.canStrip(line)) {
            continue;
        }

        switch (this.state) {
        case STATE.READING: this.read(line); break;
        case STATE.ADD_FILE: this.addFile(line); break;
        default: throw new Error('unknown state');
        }
    }

    return this;
};

exports.Parser = Parser;
exports.ParseError = ParseError;

