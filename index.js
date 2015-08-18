var Parse = require('./parser');

/**
 * Creates a new M3U8 instance around the given string file
 * contents.
 * @param {String} content
 */
function M3U8 (content) {
    this.original = content;
    this.parsed = false;
    this.tracks = [];
}

/**
 * Returns whether this instance has yet been parsed.
 * @return {Boolean}
 */
M3U8.prototype.wasParsed = function () {
    return this.parsed;
};

/**
 * Returns the total duration of the playlist.
 * @return {Number}
 */
M3U8.prototype.getDuration = function () {
    return this.tracks.reduce(function (total, track) {
        return total + track.duration;
    }, 0);
};

/**
 * Returns the value of the tag, or undefined if it was no included.
 * Case insensitive.
 * @param  {String} name
 * @return {*}
 */
M3U8.prototype.getTag = function (name) {
    return this.tags[name.toUpperCase()];
};

/**
 * Returns the number of tracks on the playlist.
 * @return {Number}
 */
M3U8.prototype.countTracks = function () {
    return this.tracks.length;
};

/**
 * Gets the track at the given index.
 * @param  {Number} index
 * @return {Track}
 */
M3U8.prototype.getTrack = function (index) {
    return this.tracks[index];
};

/**
 * Returns the track active at the given time offset.
 * @param  {Number} time given in seconds
 * @return {Number}      track index
 */
M3U8.prototype.getTrackAt = function (time) {
    if (time < 0) return -1;

    var total = 0;
    for (var i = 0; i < this.tracks.length; i++) {
        total += this.tracks[i].duration;
        if (total > time) {
            return i;
        }
    }

    return -1;
};

/**
 * Attempts to parse the m3u8 file contents, throwing an error
 * if it's invalid.
 * @return {M3U8}
 */
M3U8.prototype.parse = function () {
    var result = new Parse.Parser().parse(this.original);
    this.parsed = true;
    this.tracks = result.tracks;
    this.tags = result.tags;

    return this;
};

/**
 * Creates a new M3U8 instance based on the given content.
 * @param  {String} content
 * @return {M3U8}
 * @throws {ParseError} If the content is invalid.
 */
exports.create = function (content) {
    return new M3U8(content).parse();
};

exports.ParseError = Parse.ParseError;
