'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fluentFfmpeg = require('fluent-ffmpeg');

var _fluentFfmpeg2 = _interopRequireDefault(_fluentFfmpeg);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _del = require('del');

var _del2 = _interopRequireDefault(_del);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class ThumbnailGenerator
 */
var ThumbnailGenerator = function () {

  /**
   * @constructor
   *
   * @param {String} [opts.sourcePath] - 'full path to video file'
   * @param {String} [opts.thumbnailPath] - 'path to where thumbnail(s) should be saved'
   * @param {Number} [opts.percent]
   * @param {String} [opts.size]
   * @param {Logger} [opts.logger]
   */
  function ThumbnailGenerator(opts) {
    _classCallCheck(this, ThumbnailGenerator);

    this.sourcePath = opts.sourcePath;
    this.thumbnailPath = opts.thumbnailPath;
    this.percent = opts.percent + '%' || '90%';
    this.logger = opts.logger || null;
    this.size = opts.size || '320x240';
    this.fileNameFormat = '%b-thumbnail-%r-%000i';
    this.tmpDir = opts.tmpDir || '/tmp';

    // by include deps here, it is easier to mock them out
    this.FfmpegCommand = _fluentFfmpeg2.default;
    this.del = _del2.default;
  }

  /**
   * @method getFfmpegInstance
   *
   * @return {FfmpegCommand}
   *
   * @private
   */


  _createClass(ThumbnailGenerator, [{
    key: 'getFfmpegInstance',
    value: function getFfmpegInstance() {
      return new this.FfmpegCommand({
        source: this.sourcePath,
        logger: this.logger
      });
    }

    /**
     * Method to generate one thumbnail by being given a percentage value.
     *
     * @method generateOneByPercent
     *
     * @param {Number} percent
     * @param {String} [opts.folder]
     * @param {String} [opts.size] - 'i.e. 320x320'
     * @param {String} [opts.filename]
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generateOneByPercent',
    value: function generateOneByPercent(percent, opts) {
      if (percent < 0 || percent > 100) {
        return _bluebird2.default.reject(new Error('Percent must be a value from 0-100'));
      }

      return this.generate(_lodash2.default.assignIn(opts, {
        count: 1,
        timestamps: [percent + '%']
      })).then(function (result) {
        return result.pop();
      });
    }

    /**
     * Method to generate one thumbnail by being given a percentage value.
     *
     * @method generateOneByPercentCb
     *
     * @param {Number} percent
     * @param {Object} [opts]
     * @param {Function} cb (err, string)
     *
     * @return {Void}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generateOneByPercentCb',
    value: function generateOneByPercentCb(percent, opts, cb) {
      var callback = cb || opts;

      this.generateOneByPercent(percent, opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }

    /**
     * Method to generate thumbnails
     *
     * @method generate
     *
     * @param {String} [opts.folder]
     * @param {Number} [opts.count]
     * @param {String} [opts.size] - 'i.e. 320x320'
     * @param {String} [opts.filename]
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generate',
    value: function generate(opts) {
      var defaultSettings = {
        folder: this.thumbnailPath,
        count: 10,
        size: this.size,
        filename: this.fileNameFormat,
        logger: this.logger
      };

      var ffmpeg = this.getFfmpegInstance();
      var settings = _lodash2.default.assignIn(defaultSettings, opts);
      var filenameArray = [];

      return new _bluebird2.default(function (resolve, reject) {
        function complete() {
          resolve(filenameArray);
        }

        function filenames(fns) {
          filenameArray = fns;
        }

        ffmpeg.on('filenames', filenames).on('end', complete).on('error', reject).screenshots(settings);
      });
    }

    /**
     * Method to generate thumbnails
     *
     * @method generateCb
     *
     * @param {String} [opts.folder]
     * @param {Number} [opts.count]
     * @param {String} [opts.size] - 'i.e. 320x320'
     * @param {String} [opts.filename]
     * @param {Function} cb - (err, array)
     *
     * @return {Void}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generateCb',
    value: function generateCb(opts, cb) {
      var callback = cb || opts;

      this.generate(opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }

    /**
     * Method to generate the palette from a video (required for creating gifs)
     *
     * @method generatePalette
     *
     * @param {string} [opts.videoFilters]
     * @param {string} [opts.offset]
     * @param {string} [opts.duration]
     * @param {string} [opts.videoFilters]
     *
     * @return {Promise}
     *
     * @public
     */

  }, {
    key: 'generatePalette',
    value: function generatePalette(opts) {
      var ffmpeg = this.getFfmpegInstance();
      var defaultOpts = {
        videoFilters: 'fps=10,scale=320:-1:flags=lanczos,palettegen'
      };
      var conf = _lodash2.default.assignIn(defaultOpts, opts);
      var inputOptions = ['-y'];
      var outputOptions = ['-vf ' + conf.videoFilters];
      var output = this.tmpDir + '/palette-' + Date.now() + '.png';

      return new _bluebird2.default(function (resolve, reject) {
        function complete() {
          resolve(output);
        }

        if (conf.offset) {
          inputOptions.push('-ss ' + conf.offset);
        }

        if (conf.duration) {
          inputOptions.push('-t ' + conf.duration);
        }

        ffmpeg.inputOptions(inputOptions).outputOptions(outputOptions).on('end', complete).on('error', reject).output(output).run();
      });
    }
    /**
     * Method to generate the palette from a video (required for creating gifs)
     *
     * @method generatePaletteCb
     *
     * @param {string} [opts.videoFilters]
     * @param {string} [opts.offset]
     * @param {string} [opts.duration]
     * @param {string} [opts.videoFilters]
     * @param {Function} cb - (err, array)
     *
     * @return {Promise}
     *
     * @public
     */

  }, {
    key: 'generatePaletteCb',
    value: function generatePaletteCb(opts, cb) {
      var callback = cb || opts;

      this.generatePalette(opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }

    /**
     * Method to create a short gif thumbnail from an mp4 video
     *
     * @method generateGif
     *
     * @param {Number} opts.fps
     * @param {Number} opts.scale
     * @param {Number} opts.speedMultiple
     * @param {Boolean} opts.deletePalette
     *
     * @return {Promise}
     *
     * @public
     */

  }, {
    key: 'generateGif',
    value: function generateGif(opts) {
      var ffmpeg = this.getFfmpegInstance();
      var defaultOpts = {
        fps: 0.75,
        scale: 180,
        speedMultiplier: 4,
        deletePalette: true
      };
      var conf = _lodash2.default.assignIn(defaultOpts, opts);
      var inputOptions = [];
      var outputOptions = ['-filter_complex fps=' + conf.fps + ',setpts=(1/' + conf.speedMultiplier + ')*PTS,scale=' + conf.scale + ':-1:flags=lanczos[x];[x][1:v]paletteuse'];
      var outputFileName = conf.fileName || 'video-' + Date.now() + '.gif';
      var output = this.thumbnailPath + '/' + outputFileName;
      var d = this.del;

      function createGif(paletteFilePath) {
        if (conf.offset) {
          inputOptions.push('-ss ' + conf.offset);
        }

        if (conf.duration) {
          inputOptions.push('-t ' + conf.duration);
        }

        return new _bluebird2.default(function (resolve, reject) {
          outputOptions.unshift('-i ' + paletteFilePath);

          function complete() {
            if (conf.deletePalette === true) {
              d.sync([paletteFilePath], {
                force: true
              });
            }
            resolve(output);
          }

          ffmpeg.inputOptions(inputOptions).outputOptions(outputOptions).on('end', complete).on('error', reject).output(output).run();
        });
      }

      return this.generatePalette().then(createGif);
    }

    /**
     * Method to create a short gif thumbnail from an mp4 video
     *
     * @method generateGifCb
     *
     * @param {Number} opts.fps
     * @param {Number} opts.scale
     * @param {Number} opts.speedMultiple
     * @param {Boolean} opts.deletePalette
     * @param {Function} cb - (err, array)
     *
     * @public
     */

  }, {
    key: 'generateGifCb',
    value: function generateGifCb(opts, cb) {
      var callback = cb || opts;

      this.generateGif(opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }
  }]);

  return ThumbnailGenerator;
}();

exports.default = ThumbnailGenerator;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIlRodW1ibmFpbEdlbmVyYXRvciIsIm9wdHMiLCJzb3VyY2VQYXRoIiwidGh1bWJuYWlsUGF0aCIsInBlcmNlbnQiLCJsb2dnZXIiLCJzaXplIiwiZmlsZU5hbWVGb3JtYXQiLCJ0bXBEaXIiLCJGZm1wZWdDb21tYW5kIiwiZGVsIiwic291cmNlIiwiUHJvbWlzZSIsInJlamVjdCIsIkVycm9yIiwiZ2VuZXJhdGUiLCJfIiwiYXNzaWduSW4iLCJjb3VudCIsInRpbWVzdGFtcHMiLCJ0aGVuIiwicmVzdWx0IiwicG9wIiwiY2IiLCJjYWxsYmFjayIsImdlbmVyYXRlT25lQnlQZXJjZW50IiwiY2F0Y2giLCJkZWZhdWx0U2V0dGluZ3MiLCJmb2xkZXIiLCJmaWxlbmFtZSIsImZmbXBlZyIsImdldEZmbXBlZ0luc3RhbmNlIiwic2V0dGluZ3MiLCJmaWxlbmFtZUFycmF5IiwicmVzb2x2ZSIsImNvbXBsZXRlIiwiZmlsZW5hbWVzIiwiZm5zIiwib24iLCJzY3JlZW5zaG90cyIsImRlZmF1bHRPcHRzIiwidmlkZW9GaWx0ZXJzIiwiY29uZiIsImlucHV0T3B0aW9ucyIsIm91dHB1dE9wdGlvbnMiLCJvdXRwdXQiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwicHVzaCIsImR1cmF0aW9uIiwicnVuIiwiZ2VuZXJhdGVQYWxldHRlIiwiZnBzIiwic2NhbGUiLCJzcGVlZE11bHRpcGxpZXIiLCJkZWxldGVQYWxldHRlIiwib3V0cHV0RmlsZU5hbWUiLCJmaWxlTmFtZSIsImQiLCJjcmVhdGVHaWYiLCJwYWxldHRlRmlsZVBhdGgiLCJ1bnNoaWZ0Iiwic3luYyIsImZvcmNlIiwiZ2VuZXJhdGVHaWYiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUE7OztJQUdxQkEsa0I7O0FBRW5COzs7Ozs7Ozs7QUFTQSw4QkFBWUMsSUFBWixFQUFrQjtBQUFBOztBQUNoQixTQUFLQyxV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QUFGLENBQU8sQ0FBQ0YsZUFBRCxDQUFQLEVBQTBCO0FBQ3hCRyx1QkFBTztBQURpQixlQUExQjtBQUdEO0FBQ0Q5QixvQkFBUVcsTUFBUjtBQUNEOztBQUVEZixpQkFDR2EsWUFESCxDQUNnQkEsWUFEaEIsRUFFR0MsYUFGSCxDQUVpQkEsYUFGakIsRUFHR04sRUFISCxDQUdNLEtBSE4sRUFHYUgsUUFIYixFQUlHRyxFQUpILENBSU0sT0FKTixFQUllekIsTUFKZixFQUtHZ0MsTUFMSCxDQUtVQSxNQUxWLEVBTUdNLEdBTkg7QUFPRCxTQW5CTSxDQUFQO0FBb0JEOztBQUVELGFBQU8sS0FBS0MsZUFBTCxHQUNKaEMsSUFESSxDQUNDd0MsU0FERCxDQUFQO0FBRUQ7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7a0NBYWMzRCxJLEVBQU1zQixFLEVBQUk7QUFDdEIsVUFBTUMsV0FBV0QsTUFBTXRCLElBQXZCOztBQUVBLFdBQUtnRSxXQUFMLENBQWlCaEUsSUFBakIsRUFDR21CLElBREgsQ0FDUTtBQUFBLGVBQVVJLFNBQVMsSUFBVCxFQUFlSCxNQUFmLENBQVY7QUFBQSxPQURSLEVBRUdLLEtBRkgsQ0FFU0YsUUFGVDtBQUdEOzs7Ozs7a0JBN1RrQnhCLGtCIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEZmbXBlZ0NvbW1hbmQgZnJvbSAnZmx1ZW50LWZmbXBlZyc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGRlbCBmcm9tICdkZWwnO1xuXG4vKipcbiAqIEBjbGFzcyBUaHVtYm5haWxHZW5lcmF0b3JcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGh1bWJuYWlsR2VuZXJhdG9yIHtcblxuICAvKipcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zb3VyY2VQYXRoXSAtICdmdWxsIHBhdGggdG8gdmlkZW8gZmlsZSdcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnRodW1ibmFpbFBhdGhdIC0gJ3BhdGggdG8gd2hlcmUgdGh1bWJuYWlsKHMpIHNob3VsZCBiZSBzYXZlZCdcbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRzLnBlcmNlbnRdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zaXplXVxuICAgKiBAcGFyYW0ge0xvZ2dlcn0gW29wdHMubG9nZ2VyXVxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0cykge1xuICAgIHRoaXMuc291cmNlUGF0aCA9IG9wdHMuc291cmNlUGF0aDtcbiAgICB0aGlzLnRodW1ibmFpbFBhdGggPSBvcHRzLnRodW1ibmFpbFBhdGg7XG4gICAgdGhpcy5wZXJjZW50ID0gYCR7b3B0cy5wZXJjZW50fSVgIHx8ICc5MCUnO1xuICAgIHRoaXMubG9nZ2VyID0gb3B0cy5sb2dnZXIgfHwgbnVsbDtcbiAgICB0aGlzLnNpemUgPSBvcHRzLnNpemUgfHwgJzMyMHgyNDAnO1xuICAgIHRoaXMuZmlsZU5hbWVGb3JtYXQgPSAnJWItdGh1bWJuYWlsLSVyLSUwMDBpJztcbiAgICB0aGlzLnRtcERpciA9IG9wdHMudG1wRGlyIHx8ICcvdG1wJztcblxuICAgIC8vIGJ5IGluY2x1ZGUgZGVwcyBoZXJlLCBpdCBpcyBlYXNpZXIgdG8gbW9jayB0aGVtIG91dFxuICAgIHRoaXMuRmZtcGVnQ29tbWFuZCA9IEZmbXBlZ0NvbW1hbmQ7XG4gICAgdGhpcy5kZWwgPSBkZWw7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBnZXRGZm1wZWdJbnN0YW5jZVxuICAgKlxuICAgKiBAcmV0dXJuIHtGZm1wZWdDb21tYW5kfVxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0RmZtcGVnSW5zdGFuY2UoKSB7XG4gICAgcmV0dXJuIG5ldyB0aGlzLkZmbXBlZ0NvbW1hbmQoe1xuICAgICAgc291cmNlOiB0aGlzLnNvdXJjZVBhdGgsXG4gICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSBvbmUgdGh1bWJuYWlsIGJ5IGJlaW5nIGdpdmVuIGEgcGVyY2VudGFnZSB2YWx1ZS5cbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZU9uZUJ5UGVyY2VudFxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gcGVyY2VudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuZm9sZGVyXVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuc2l6ZV0gLSAnaS5lLiAzMjB4MzIwJ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuZmlsZW5hbWVdXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICpcbiAgICogQGFzeW5jXG4gICAqL1xuICBnZW5lcmF0ZU9uZUJ5UGVyY2VudChwZXJjZW50LCBvcHRzKSB7XG4gICAgaWYgKHBlcmNlbnQgPCAwIHx8IHBlcmNlbnQgPiAxMDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1BlcmNlbnQgbXVzdCBiZSBhIHZhbHVlIGZyb20gMC0xMDAnKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGUoXy5hc3NpZ25JbihvcHRzLCB7XG4gICAgICBjb3VudDogMSxcbiAgICAgIHRpbWVzdGFtcHM6IFtgJHtwZXJjZW50fSVgXSxcbiAgICB9KSlcbiAgICAgIC50aGVuKHJlc3VsdCA9PiByZXN1bHQucG9wKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSBvbmUgdGh1bWJuYWlsIGJ5IGJlaW5nIGdpdmVuIGEgcGVyY2VudGFnZSB2YWx1ZS5cbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZU9uZUJ5UGVyY2VudENiXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJjZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c11cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgKGVyciwgc3RyaW5nKVxuICAgKlxuICAgKiBAcmV0dXJuIHtWb2lkfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqXG4gICAqIEBhc3luY1xuICAgKi9cbiAgZ2VuZXJhdGVPbmVCeVBlcmNlbnRDYihwZXJjZW50LCBvcHRzLCBjYikge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gY2IgfHwgb3B0cztcblxuICAgIHRoaXMuZ2VuZXJhdGVPbmVCeVBlcmNlbnQocGVyY2VudCwgb3B0cylcbiAgICAgIC50aGVuKHJlc3VsdCA9PiBjYWxsYmFjayhudWxsLCByZXN1bHQpKVxuICAgICAgLmNhdGNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgdGh1bWJuYWlsc1xuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5mb2xkZXJdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0cy5jb3VudF1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnNpemVdIC0gJ2kuZS4gMzIweDMyMCdcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZpbGVuYW1lXVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqXG4gICAqIEBhc3luY1xuICAgKi9cbiAgZ2VuZXJhdGUob3B0cykge1xuICAgIGNvbnN0IGRlZmF1bHRTZXR0aW5ncyA9IHtcbiAgICAgIGZvbGRlcjogdGhpcy50aHVtYm5haWxQYXRoLFxuICAgICAgY291bnQ6IDEwLFxuICAgICAgc2l6ZTogdGhpcy5zaXplLFxuICAgICAgZmlsZW5hbWU6IHRoaXMuZmlsZU5hbWVGb3JtYXQsXG4gICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgIH07XG5cbiAgICBjb25zdCBmZm1wZWcgPSB0aGlzLmdldEZmbXBlZ0luc3RhbmNlKCk7XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBfLmFzc2lnbkluKGRlZmF1bHRTZXR0aW5ncywgb3B0cyk7XG4gICAgbGV0IGZpbGVuYW1lQXJyYXkgPSBbXTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgcmVzb2x2ZShmaWxlbmFtZUFycmF5KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmlsZW5hbWVzKGZucykge1xuICAgICAgICBmaWxlbmFtZUFycmF5ID0gZm5zO1xuICAgICAgfVxuXG4gICAgICBmZm1wZWdcbiAgICAgICAgLm9uKCdmaWxlbmFtZXMnLCBmaWxlbmFtZXMpXG4gICAgICAgIC5vbignZW5kJywgY29tcGxldGUpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAgIC5zY3JlZW5zaG90cyhzZXR0aW5ncyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIHRodW1ibmFpbHNcbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZUNiXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5mb2xkZXJdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0cy5jb3VudF1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnNpemVdIC0gJ2kuZS4gMzIweDMyMCdcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZpbGVuYW1lXVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIChlcnIsIGFycmF5KVxuICAgKlxuICAgKiBAcmV0dXJuIHtWb2lkfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqXG4gICAqIEBhc3luY1xuICAgKi9cbiAgZ2VuZXJhdGVDYihvcHRzLCBjYikge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gY2IgfHwgb3B0cztcblxuICAgIHRoaXMuZ2VuZXJhdGUob3B0cylcbiAgICAgIC50aGVuKHJlc3VsdCA9PiBjYWxsYmFjayhudWxsLCByZXN1bHQpKVxuICAgICAgLmNhdGNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgdGhlIHBhbGV0dGUgZnJvbSBhIHZpZGVvIChyZXF1aXJlZCBmb3IgY3JlYXRpbmcgZ2lmcylcbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZVBhbGV0dGVcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLnZpZGVvRmlsdGVyc11cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLm9mZnNldF1cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLmR1cmF0aW9uXVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMudmlkZW9GaWx0ZXJzXVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuICBnZW5lcmF0ZVBhbGV0dGUob3B0cykge1xuICAgIGNvbnN0IGZmbXBlZyA9IHRoaXMuZ2V0RmZtcGVnSW5zdGFuY2UoKTtcbiAgICBjb25zdCBkZWZhdWx0T3B0cyA9IHtcbiAgICAgIHZpZGVvRmlsdGVyczogJ2Zwcz0xMCxzY2FsZT0zMjA6LTE6ZmxhZ3M9bGFuY3pvcyxwYWxldHRlZ2VuJyxcbiAgICB9O1xuICAgIGNvbnN0IGNvbmYgPSBfLmFzc2lnbkluKGRlZmF1bHRPcHRzLCBvcHRzKTtcbiAgICBjb25zdCBpbnB1dE9wdGlvbnMgPSBbXG4gICAgICAnLXknLFxuICAgIF07XG4gICAgY29uc3Qgb3V0cHV0T3B0aW9ucyA9IFtcbiAgICAgIGAtdmYgJHtjb25mLnZpZGVvRmlsdGVyc31gLFxuICAgIF07XG4gICAgY29uc3Qgb3V0cHV0ID0gYCR7dGhpcy50bXBEaXJ9L3BhbGV0dGUtJHtEYXRlLm5vdygpfS5wbmdgO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICByZXNvbHZlKG91dHB1dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLm9mZnNldCkge1xuICAgICAgICBpbnB1dE9wdGlvbnMucHVzaChgLXNzICR7Y29uZi5vZmZzZXR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmR1cmF0aW9uKSB7XG4gICAgICAgIGlucHV0T3B0aW9ucy5wdXNoKGAtdCAke2NvbmYuZHVyYXRpb259YCk7XG4gICAgICB9XG5cbiAgICAgIGZmbXBlZ1xuICAgICAgICAuaW5wdXRPcHRpb25zKGlucHV0T3B0aW9ucylcbiAgICAgICAgLm91dHB1dE9wdGlvbnMob3V0cHV0T3B0aW9ucylcbiAgICAgICAgLm9uKCdlbmQnLCBjb21wbGV0ZSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdClcbiAgICAgICAgLm91dHB1dChvdXRwdXQpXG4gICAgICAgIC5ydW4oKTtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIHRoZSBwYWxldHRlIGZyb20gYSB2aWRlbyAocmVxdWlyZWQgZm9yIGNyZWF0aW5nIGdpZnMpXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVQYWxldHRlQ2JcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLnZpZGVvRmlsdGVyc11cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLm9mZnNldF1cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLmR1cmF0aW9uXVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMudmlkZW9GaWx0ZXJzXVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIChlcnIsIGFycmF5KVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuICBnZW5lcmF0ZVBhbGV0dGVDYihvcHRzLCBjYikge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gY2IgfHwgb3B0cztcblxuICAgIHRoaXMuZ2VuZXJhdGVQYWxldHRlKG9wdHMpXG4gICAgICAudGhlbihyZXN1bHQgPT4gY2FsbGJhY2sobnVsbCwgcmVzdWx0KSlcbiAgICAgIC5jYXRjaChjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGNyZWF0ZSBhIHNob3J0IGdpZiB0aHVtYm5haWwgZnJvbSBhbiBtcDQgdmlkZW9cbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZUdpZlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5mcHNcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuc2NhbGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuc3BlZWRNdWx0aXBsZVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMuZGVsZXRlUGFsZXR0ZVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuICBnZW5lcmF0ZUdpZihvcHRzKSB7XG4gICAgY29uc3QgZmZtcGVnID0gdGhpcy5nZXRGZm1wZWdJbnN0YW5jZSgpO1xuICAgIGNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgICAgZnBzOiAwLjc1LFxuICAgICAgc2NhbGU6IDE4MCxcbiAgICAgIHNwZWVkTXVsdGlwbGllcjogNCxcbiAgICAgIGRlbGV0ZVBhbGV0dGU6IHRydWUsXG4gICAgfTtcbiAgICBjb25zdCBjb25mID0gXy5hc3NpZ25JbihkZWZhdWx0T3B0cywgb3B0cyk7XG4gICAgY29uc3QgaW5wdXRPcHRpb25zID0gW107XG4gICAgY29uc3Qgb3V0cHV0T3B0aW9ucyA9IFtgLWZpbHRlcl9jb21wbGV4IGZwcz0ke2NvbmYuZnBzfSxzZXRwdHM9KDEvJHtjb25mLnNwZWVkTXVsdGlwbGllcn0pKlBUUyxzY2FsZT0ke2NvbmYuc2NhbGV9Oi0xOmZsYWdzPWxhbmN6b3NbeF07W3hdWzE6dl1wYWxldHRldXNlYF07XG4gICAgY29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBjb25mLmZpbGVOYW1lIHx8IGB2aWRlby0ke0RhdGUubm93KCl9LmdpZmA7XG4gICAgY29uc3Qgb3V0cHV0ID0gYCR7dGhpcy50aHVtYm5haWxQYXRofS8ke291dHB1dEZpbGVOYW1lfWA7XG4gICAgY29uc3QgZCA9IHRoaXMuZGVsO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlR2lmKHBhbGV0dGVGaWxlUGF0aCkge1xuICAgICAgaWYgKGNvbmYub2Zmc2V0KSB7XG4gICAgICAgIGlucHV0T3B0aW9ucy5wdXNoKGAtc3MgJHtjb25mLm9mZnNldH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZHVyYXRpb24pIHtcbiAgICAgICAgaW5wdXRPcHRpb25zLnB1c2goYC10ICR7Y29uZi5kdXJhdGlvbn1gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgb3V0cHV0T3B0aW9ucy51bnNoaWZ0KGAtaSAke3BhbGV0dGVGaWxlUGF0aH1gKTtcblxuICAgICAgICBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgICBpZiAoY29uZi5kZWxldGVQYWxldHRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBkLnN5bmMoW3BhbGV0dGVGaWxlUGF0aF0sIHtcbiAgICAgICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmZtcGVnXG4gICAgICAgICAgLmlucHV0T3B0aW9ucyhpbnB1dE9wdGlvbnMpXG4gICAgICAgICAgLm91dHB1dE9wdGlvbnMob3V0cHV0T3B0aW9ucylcbiAgICAgICAgICAub24oJ2VuZCcsIGNvbXBsZXRlKVxuICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAgICAgLm91dHB1dChvdXRwdXQpXG4gICAgICAgICAgLnJ1bigpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVQYWxldHRlKClcbiAgICAgIC50aGVuKGNyZWF0ZUdpZik7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGNyZWF0ZSBhIHNob3J0IGdpZiB0aHVtYm5haWwgZnJvbSBhbiBtcDQgdmlkZW9cbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZUdpZkNiXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmZwc1xuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5zY2FsZVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5zcGVlZE11bHRpcGxlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5kZWxldGVQYWxldHRlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gKGVyciwgYXJyYXkpXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIGdlbmVyYXRlR2lmQ2Iob3B0cywgY2IpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNiIHx8IG9wdHM7XG5cbiAgICB0aGlzLmdlbmVyYXRlR2lmKG9wdHMpXG4gICAgICAudGhlbihyZXN1bHQgPT4gY2FsbGJhY2sobnVsbCwgcmVzdWx0KSlcbiAgICAgIC5jYXRjaChjYWxsYmFjayk7XG4gIH1cbn1cbiJdfQ==
