var expect = require('chai').expect;
var M3U8 = require('./');

describe('m3u8', function () {
    var valid;

    beforeEach(function () {
        valid = '#EXTM3U\r\n' +
            '#EXT-X-VERSION:3\r\n' +
            '#EXT-X-MEDIA-SEQUENCE:0\r\n' +
            '#EXT-X-ALLOW-CACHE:YES\r\n' +
            '#EXT-X-TARGETDURATION:6\r\n' +
            '#EXTINF:5.040000,\r\n' +
            '00000000_source.mp4\r\n' +
            '#EXTINF:5.000000,Second Track\r\n' +
            '00000001_source.mp4\r\n' +
            '#EXT-X-DISCONTINUITY\r\n' +
            '#EXTINF:5.000000, Third Track\n' +
            '00000002_source.mp4\n' +
            '#EXTINF:5.000000\n' +
            '#EXT-X-PROGRAM-DATE-TIME:2010-02-19T14:54:23.031+08:00\n' +
            '00000003_source.mp4\n' +
            '#EXTINF:2.360000,\n' +
            '00000004_source.mp4\n';
    });

    describe('parsing', function () {
        it('throws an error on empty or nullish contents', function () {
            expect(function () {
                M3U8.create();
            }).to.throw(M3U8.ParseError, /cannot parse undefined/);
            expect(function () {
                M3U8.create('');
            }).to.throw(M3U8.ParseError, /cannot parse ""/);
            expect(function () {
                M3U8.create(null);
            }).to.throw(M3U8.ParseError, /cannot parse null/);
        });

        it('parses correct files', function () {
            M3U8.create(valid);
        });

        it('works with basic getters', function () {
            var m = M3U8.create(valid);
            expect(m.countTracks()).to.equal(5);
            expect(m.wasParsed()).to.be.true;
            var t = m.getTrack(0);
            expect(t.getFile()).to.equal('00000000_source.mp4');
            expect(t.getDuration()).to.equal(5.04);
            expect(t.getName()).to.be.undefined;
        });

        it('gets a track at a certain time', function () {
            var m = M3U8.create(valid);
            expect(m.getTrackAt(-1)).to.equal(-1);
            expect(m.getTrackAt(0)).to.equal(0);
            expect(m.getTrackAt(5)).to.equal(0);
            expect(m.getTrackAt(10)).to.equal(1);
            expect(m.getTrackAt(11)).to.equal(2);
            expect(m.getTrackAt(110)).to.equal(-1);
        });

        it('errors if missing header', function () {
            valid = valid.replace('#EXTM3U\r\n', '');
            expect(function () {
                M3U8.create(valid);
            }).to.throw(M3U8.ParseError, /#EXTM3U must be the first line in the file/);
        });

        it('errors on duplicate version tags', function () {
            valid += '#EXT-X-VERSION:3';
            expect(function () {
                M3U8.create(valid);
            }).to.throw(M3U8.ParseError, /Version may only be defined once/);
        });

        it('errors if target duration is not defined', function () {
            valid = valid.replace('EXT-X-TARGETDURATION:6', '');
            expect(function () {
                M3U8.create(valid);
            }).to.throw(M3U8.ParseError);
        });

        it('errors if media segments are greater than the target', function () {
            valid = valid.replace('EXT-X-TARGETDURATION:6', 'EXT-X-TARGETDURATION:2');
            expect(function () {
                M3U8.create(valid);
            }).to.throw(M3U8.ParseError, /must be less than the TARGETDURATION/);
        });

        it('reads out tracks', function () {
            var tracks = M3U8.create(valid).tracks;
            var expectations = [{
                duration: 5.04,
                file: '00000000_source.mp4',
                name: undefined,
                discontinuous: false,
            }, {
                duration: 5,
                file: '00000001_source.mp4',
                name: 'Second Track',
                discontinuous: false,
            }, {
                duration: 5,
                file: '00000002_source.mp4',
                name: 'Third Track',
                discontinuous: true,
            }, {
                duration: 5,
                file: '00000003_source.mp4',
                name: undefined,
                discontinuous: false,
                time: new Date(1266562463031),
            }, {
                duration: 2.36,
                file: '00000004_source.mp4',
                name: undefined,
                discontinuous: false,
            }];

            expectations.forEach(function (e, i) {
                for (var key in e) {
                    expect(tracks[i][key]).to.deep.equal(e[key]);
                }
            });
        });
    });

    describe('playlist object', function () {
        var playlist;

        beforeEach(function () {
            playlist = M3U8.create(valid);
        });

        it('calculates the total duration', function () {
            expect(playlist.getDuration()).to.equal(22.4);
        });

        it('gets tag data', function () {
            expect(playlist.getTag('version')).to.equal(3);
        });
    });
});
