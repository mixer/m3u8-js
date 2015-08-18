/**
 * Represents a track that's part of an M3U8 manifest.
 * @param {Number} duration track duration in seconds
 * @param {String} name     name of the track (can be empty)
 * @param {String} file     path of the file
 * @param {Boolean} discontinuous
 */
function Track (duration, name, discontinuous) {
    this.duration = duration;
    this.name = name;
    this.discontinuous = discontinuous;
}

/**
 * Sets the track's associated file.
 * @param {String} file
 */
Track.prototype.setFile = function (file) {
    this.file = file;
};

/**
 * Sets this track's absolute starts time.
 * @param {Number} time
 */
Track.prototype.setTime = function (time) {
    this.time = time;
};

/**
 * Returns the track file.
 * @return {String}
 */
Track.prototype.getFile = function () {
    return this.file;
};

/**
 * Returns the track duration.
 * @return {String}
 */
Track.prototype.getDuration = function () {
    return this.duration;
};

/**
 * Returns the track name.
 * @return {String}
 */
Track.prototype.getName = function () {
    return this.name;
};

module.exports = Track;
