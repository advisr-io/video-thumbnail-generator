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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIlRodW1ibmFpbEdlbmVyYXRvciIsIm9wdHMiLCJzb3VyY2VQYXRoIiwidGh1bWJuYWlsUGF0aCIsInBlcmNlbnQiLCJsb2dnZXIiLCJzaXplIiwiZmlsZU5hbWVGb3JtYXQiLCJ0bXBEaXIiLCJGZm1wZWdDb21tYW5kIiwiZGVsIiwic291cmNlIiwicmVqZWN0IiwiRXJyb3IiLCJnZW5lcmF0ZSIsImFzc2lnbkluIiwiY291bnQiLCJ0aW1lc3RhbXBzIiwidGhlbiIsInJlc3VsdCIsInBvcCIsImNiIiwiY2FsbGJhY2siLCJnZW5lcmF0ZU9uZUJ5UGVyY2VudCIsImNhdGNoIiwiZGVmYXVsdFNldHRpbmdzIiwiZm9sZGVyIiwiZmlsZW5hbWUiLCJmZm1wZWciLCJnZXRGZm1wZWdJbnN0YW5jZSIsInNldHRpbmdzIiwiZmlsZW5hbWVBcnJheSIsInJlc29sdmUiLCJjb21wbGV0ZSIsImZpbGVuYW1lcyIsImZucyIsIm9uIiwic2NyZWVuc2hvdHMiLCJkZWZhdWx0T3B0cyIsInZpZGVvRmlsdGVycyIsImNvbmYiLCJpbnB1dE9wdGlvbnMiLCJvdXRwdXRPcHRpb25zIiwib3V0cHV0IiwiRGF0ZSIsIm5vdyIsIm9mZnNldCIsInB1c2giLCJkdXJhdGlvbiIsInJ1biIsImdlbmVyYXRlUGFsZXR0ZSIsImZwcyIsInNjYWxlIiwic3BlZWRNdWx0aXBsaWVyIiwiZGVsZXRlUGFsZXR0ZSIsIm91dHB1dEZpbGVOYW1lIiwiZmlsZU5hbWUiLCJkIiwiY3JlYXRlR2lmIiwicGFsZXR0ZUZpbGVQYXRoIiwidW5zaGlmdCIsInN5bmMiLCJmb3JjZSIsImdlbmVyYXRlR2lmIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7OztBQUVBOzs7SUFHcUJBLGtCOztBQUVuQjs7Ozs7Ozs7O0FBU0EsOEJBQVlDLElBQVosRUFBa0I7QUFBQTs7QUFDaEIsU0FBS0MsVUFBTCxHQUFrQkQsS0FB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QUFFRGYsaUJBQ0dhLFlBREgsQ0FDZ0JBLFlBRGhCLEVBRUdDLGFBRkgsQ0FFaUJBLGFBRmpCLEVBR0dOLEVBSEgsQ0FHTSxLQUhOLEVBR2FILFFBSGIsRUFJR0csRUFKSCxDQUlNLE9BSk4sRUFJZXhCLE1BSmYsRUFLRytCLE1BTEgsQ0FLVUEsTUFMVixFQU1HTSxHQU5IO0FBT0QsU0FuQk0sQ0FBUDtBQW9CRDs7QUFFRCxhQUFPLEtBQUtDLGVBQUwsR0FDSmhDLElBREksQ0FDQ3dDLFNBREQsQ0FBUDtBQUVEOztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7O2tDQWFjekQsSSxFQUFNb0IsRSxFQUFJO0FBQ3RCLFVBQU1DLFdBQVdELE1BQU1wQixJQUF2Qjs7QUFFQSxXQUFLOEQsV0FBTCxDQUFpQjlELElBQWpCLEVBQ0dpQixJQURILENBQ1E7QUFBQSxlQUFVSSxTQUFTLElBQVQsRUFBZUgsTUFBZixDQUFWO0FBQUEsT0FEUixFQUVHSyxLQUZILENBRVNGLFFBRlQ7QUFHRDs7Ozs7O2tCQTdUa0J0QixrQiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBGZm1wZWdDb21tYW5kIGZyb20gJ2ZsdWVudC1mZm1wZWcnO1xuaW1wb3J0IFByb21pc2UgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBkZWwgZnJvbSAnZGVsJztcblxuLyoqXG4gKiBAY2xhc3MgVGh1bWJuYWlsR2VuZXJhdG9yXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRodW1ibmFpbEdlbmVyYXRvciB7XG5cbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuc291cmNlUGF0aF0gLSAnZnVsbCBwYXRoIHRvIHZpZGVvIGZpbGUnXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy50aHVtYm5haWxQYXRoXSAtICdwYXRoIHRvIHdoZXJlIHRodW1ibmFpbChzKSBzaG91bGQgYmUgc2F2ZWQnXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0cy5wZXJjZW50XVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuc2l6ZV1cbiAgICogQHBhcmFtIHtMb2dnZXJ9IFtvcHRzLmxvZ2dlcl1cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLnNvdXJjZVBhdGggPSBvcHRzLnNvdXJjZVBhdGg7XG4gICAgdGhpcy50aHVtYm5haWxQYXRoID0gb3B0cy50aHVtYm5haWxQYXRoO1xuICAgIHRoaXMucGVyY2VudCA9IGAke29wdHMucGVyY2VudH0lYCB8fCAnOTAlJztcbiAgICB0aGlzLmxvZ2dlciA9IG9wdHMubG9nZ2VyIHx8IG51bGw7XG4gICAgdGhpcy5zaXplID0gb3B0cy5zaXplIHx8ICczMjB4MjQwJztcbiAgICB0aGlzLmZpbGVOYW1lRm9ybWF0ID0gJyViLXRodW1ibmFpbC0lci0lMDAwaSc7XG4gICAgdGhpcy50bXBEaXIgPSBvcHRzLnRtcERpciB8fCAnL3RtcCc7XG5cbiAgICAvLyBieSBpbmNsdWRlIGRlcHMgaGVyZSwgaXQgaXMgZWFzaWVyIHRvIG1vY2sgdGhlbSBvdXRcbiAgICB0aGlzLkZmbXBlZ0NvbW1hbmQgPSBGZm1wZWdDb21tYW5kO1xuICAgIHRoaXMuZGVsID0gZGVsO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZXRob2QgZ2V0RmZtcGVnSW5zdGFuY2VcbiAgICpcbiAgICogQHJldHVybiB7RmZtcGVnQ29tbWFuZH1cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGdldEZmbXBlZ0luc3RhbmNlKCkge1xuICAgIHJldHVybiBuZXcgdGhpcy5GZm1wZWdDb21tYW5kKHtcbiAgICAgIHNvdXJjZTogdGhpcy5zb3VyY2VQYXRoLFxuICAgICAgbG9nZ2VyOiB0aGlzLmxvZ2dlcixcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgb25lIHRodW1ibmFpbCBieSBiZWluZyBnaXZlbiBhIHBlcmNlbnRhZ2UgdmFsdWUuXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVPbmVCeVBlcmNlbnRcbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmNlbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZvbGRlcl1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnNpemVdIC0gJ2kuZS4gMzIweDMyMCdcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZpbGVuYW1lXVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqXG4gICAqIEBhc3luY1xuICAgKi9cbiAgZ2VuZXJhdGVPbmVCeVBlcmNlbnQocGVyY2VudCwgb3B0cykge1xuICAgIGlmIChwZXJjZW50IDwgMCB8fCBwZXJjZW50ID4gMTAwKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdQZXJjZW50IG11c3QgYmUgYSB2YWx1ZSBmcm9tIDAtMTAwJykpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdlbmVyYXRlKF8uYXNzaWduSW4ob3B0cywge1xuICAgICAgY291bnQ6IDEsXG4gICAgICB0aW1lc3RhbXBzOiBbYCR7cGVyY2VudH0lYF0sXG4gICAgfSkpXG4gICAgICAudGhlbihyZXN1bHQgPT4gcmVzdWx0LnBvcCgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgb25lIHRodW1ibmFpbCBieSBiZWluZyBnaXZlbiBhIHBlcmNlbnRhZ2UgdmFsdWUuXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVPbmVCeVBlcmNlbnRDYlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gcGVyY2VudFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdHNdXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIChlcnIsIHN0cmluZylcbiAgICpcbiAgICogQHJldHVybiB7Vm9pZH1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKlxuICAgKiBAYXN5bmNcbiAgICovXG4gIGdlbmVyYXRlT25lQnlQZXJjZW50Q2IocGVyY2VudCwgb3B0cywgY2IpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNiIHx8IG9wdHM7XG5cbiAgICB0aGlzLmdlbmVyYXRlT25lQnlQZXJjZW50KHBlcmNlbnQsIG9wdHMpXG4gICAgICAudGhlbihyZXN1bHQgPT4gY2FsbGJhY2sobnVsbCwgcmVzdWx0KSlcbiAgICAgIC5jYXRjaChjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIHRodW1ibmFpbHNcbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuZm9sZGVyXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW29wdHMuY291bnRdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zaXplXSAtICdpLmUuIDMyMHgzMjAnXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5maWxlbmFtZV1cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKlxuICAgKiBAYXN5bmNcbiAgICovXG4gIGdlbmVyYXRlKG9wdHMpIHtcbiAgICBjb25zdCBkZWZhdWx0U2V0dGluZ3MgPSB7XG4gICAgICBmb2xkZXI6IHRoaXMudGh1bWJuYWlsUGF0aCxcbiAgICAgIGNvdW50OiAxMCxcbiAgICAgIHNpemU6IHRoaXMuc2l6ZSxcbiAgICAgIGZpbGVuYW1lOiB0aGlzLmZpbGVOYW1lRm9ybWF0LFxuICAgICAgbG9nZ2VyOiB0aGlzLmxvZ2dlcixcbiAgICB9O1xuXG4gICAgY29uc3QgZmZtcGVnID0gdGhpcy5nZXRGZm1wZWdJbnN0YW5jZSgpO1xuICAgIGNvbnN0IHNldHRpbmdzID0gXy5hc3NpZ25JbihkZWZhdWx0U2V0dGluZ3MsIG9wdHMpO1xuICAgIGxldCBmaWxlbmFtZUFycmF5ID0gW107XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgIHJlc29sdmUoZmlsZW5hbWVBcnJheSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZpbGVuYW1lcyhmbnMpIHtcbiAgICAgICAgZmlsZW5hbWVBcnJheSA9IGZucztcbiAgICAgIH1cblxuICAgICAgZmZtcGVnXG4gICAgICAgIC5vbignZmlsZW5hbWVzJywgZmlsZW5hbWVzKVxuICAgICAgICAub24oJ2VuZCcsIGNvbXBsZXRlKVxuICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KVxuICAgICAgICAuc2NyZWVuc2hvdHMoc2V0dGluZ3MpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSB0aHVtYm5haWxzXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVDYlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuZm9sZGVyXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW29wdHMuY291bnRdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zaXplXSAtICdpLmUuIDMyMHgzMjAnXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5maWxlbmFtZV1cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSAoZXJyLCBhcnJheSlcbiAgICpcbiAgICogQHJldHVybiB7Vm9pZH1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKlxuICAgKiBAYXN5bmNcbiAgICovXG4gIGdlbmVyYXRlQ2Iob3B0cywgY2IpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNiIHx8IG9wdHM7XG5cbiAgICB0aGlzLmdlbmVyYXRlKG9wdHMpXG4gICAgICAudGhlbihyZXN1bHQgPT4gY2FsbGJhY2sobnVsbCwgcmVzdWx0KSlcbiAgICAgIC5jYXRjaChjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIHRoZSBwYWxldHRlIGZyb20gYSB2aWRlbyAocmVxdWlyZWQgZm9yIGNyZWF0aW5nIGdpZnMpXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVQYWxldHRlXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy52aWRlb0ZpbHRlcnNdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy5vZmZzZXRdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy5kdXJhdGlvbl1cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLnZpZGVvRmlsdGVyc11cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbiAgZ2VuZXJhdGVQYWxldHRlKG9wdHMpIHtcbiAgICBjb25zdCBmZm1wZWcgPSB0aGlzLmdldEZmbXBlZ0luc3RhbmNlKCk7XG4gICAgY29uc3QgZGVmYXVsdE9wdHMgPSB7XG4gICAgICB2aWRlb0ZpbHRlcnM6ICdmcHM9MTAsc2NhbGU9MzIwOi0xOmZsYWdzPWxhbmN6b3MscGFsZXR0ZWdlbicsXG4gICAgfTtcbiAgICBjb25zdCBjb25mID0gXy5hc3NpZ25JbihkZWZhdWx0T3B0cywgb3B0cyk7XG4gICAgY29uc3QgaW5wdXRPcHRpb25zID0gW1xuICAgICAgJy15JyxcbiAgICBdO1xuICAgIGNvbnN0IG91dHB1dE9wdGlvbnMgPSBbXG4gICAgICBgLXZmICR7Y29uZi52aWRlb0ZpbHRlcnN9YCxcbiAgICBdO1xuICAgIGNvbnN0IG91dHB1dCA9IGAke3RoaXMudG1wRGlyfS9wYWxldHRlLSR7RGF0ZS5ub3coKX0ucG5nYDtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5vZmZzZXQpIHtcbiAgICAgICAgaW5wdXRPcHRpb25zLnB1c2goYC1zcyAke2NvbmYub2Zmc2V0fWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5kdXJhdGlvbikge1xuICAgICAgICBpbnB1dE9wdGlvbnMucHVzaChgLXQgJHtjb25mLmR1cmF0aW9ufWApO1xuICAgICAgfVxuXG4gICAgICBmZm1wZWdcbiAgICAgICAgLmlucHV0T3B0aW9ucyhpbnB1dE9wdGlvbnMpXG4gICAgICAgIC5vdXRwdXRPcHRpb25zKG91dHB1dE9wdGlvbnMpXG4gICAgICAgIC5vbignZW5kJywgY29tcGxldGUpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAgIC5vdXRwdXQob3V0cHV0KVxuICAgICAgICAucnVuKCk7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSB0aGUgcGFsZXR0ZSBmcm9tIGEgdmlkZW8gKHJlcXVpcmVkIGZvciBjcmVhdGluZyBnaWZzKVxuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlUGFsZXR0ZUNiXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy52aWRlb0ZpbHRlcnNdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy5vZmZzZXRdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy5kdXJhdGlvbl1cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLnZpZGVvRmlsdGVyc11cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSAoZXJyLCBhcnJheSlcbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbiAgZ2VuZXJhdGVQYWxldHRlQ2Iob3B0cywgY2IpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNiIHx8IG9wdHM7XG5cbiAgICB0aGlzLmdlbmVyYXRlUGFsZXR0ZShvcHRzKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkpXG4gICAgICAuY2F0Y2goY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBjcmVhdGUgYSBzaG9ydCBnaWYgdGh1bWJuYWlsIGZyb20gYW4gbXA0IHZpZGVvXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVHaWZcbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuZnBzXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLnNjYWxlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLnNwZWVkTXVsdGlwbGVcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmRlbGV0ZVBhbGV0dGVcbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbiAgZ2VuZXJhdGVHaWYob3B0cykge1xuICAgIGNvbnN0IGZmbXBlZyA9IHRoaXMuZ2V0RmZtcGVnSW5zdGFuY2UoKTtcbiAgICBjb25zdCBkZWZhdWx0T3B0cyA9IHtcbiAgICAgIGZwczogMC43NSxcbiAgICAgIHNjYWxlOiAxODAsXG4gICAgICBzcGVlZE11bHRpcGxpZXI6IDQsXG4gICAgICBkZWxldGVQYWxldHRlOiB0cnVlLFxuICAgIH07XG4gICAgY29uc3QgY29uZiA9IF8uYXNzaWduSW4oZGVmYXVsdE9wdHMsIG9wdHMpO1xuICAgIGNvbnN0IGlucHV0T3B0aW9ucyA9IFtdO1xuICAgIGNvbnN0IG91dHB1dE9wdGlvbnMgPSBbYC1maWx0ZXJfY29tcGxleCBmcHM9JHtjb25mLmZwc30sc2V0cHRzPSgxLyR7Y29uZi5zcGVlZE11bHRpcGxpZXJ9KSpQVFMsc2NhbGU9JHtjb25mLnNjYWxlfTotMTpmbGFncz1sYW5jem9zW3hdO1t4XVsxOnZdcGFsZXR0ZXVzZWBdO1xuICAgIGNvbnN0IG91dHB1dEZpbGVOYW1lID0gY29uZi5maWxlTmFtZSB8fCBgdmlkZW8tJHtEYXRlLm5vdygpfS5naWZgO1xuICAgIGNvbnN0IG91dHB1dCA9IGAke3RoaXMudGh1bWJuYWlsUGF0aH0vJHtvdXRwdXRGaWxlTmFtZX1gO1xuICAgIGNvbnN0IGQgPSB0aGlzLmRlbDtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUdpZihwYWxldHRlRmlsZVBhdGgpIHtcbiAgICAgIGlmIChjb25mLm9mZnNldCkge1xuICAgICAgICBpbnB1dE9wdGlvbnMucHVzaChgLXNzICR7Y29uZi5vZmZzZXR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmR1cmF0aW9uKSB7XG4gICAgICAgIGlucHV0T3B0aW9ucy5wdXNoKGAtdCAke2NvbmYuZHVyYXRpb259YCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIG91dHB1dE9wdGlvbnMudW5zaGlmdChgLWkgJHtwYWxldHRlRmlsZVBhdGh9YCk7XG5cbiAgICAgICAgZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgICAgaWYgKGNvbmYuZGVsZXRlUGFsZXR0ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgZC5zeW5jKFtwYWxldHRlRmlsZVBhdGhdLCB7XG4gICAgICAgICAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUob3V0cHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZmbXBlZ1xuICAgICAgICAgIC5pbnB1dE9wdGlvbnMoaW5wdXRPcHRpb25zKVxuICAgICAgICAgIC5vdXRwdXRPcHRpb25zKG91dHB1dE9wdGlvbnMpXG4gICAgICAgICAgLm9uKCdlbmQnLCBjb21wbGV0ZSlcbiAgICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KVxuICAgICAgICAgIC5vdXRwdXQob3V0cHV0KVxuICAgICAgICAgIC5ydW4oKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdlbmVyYXRlUGFsZXR0ZSgpXG4gICAgICAudGhlbihjcmVhdGVHaWYpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBjcmVhdGUgYSBzaG9ydCBnaWYgdGh1bWJuYWlsIGZyb20gYW4gbXA0IHZpZGVvXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVHaWZDYlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5mcHNcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuc2NhbGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuc3BlZWRNdWx0aXBsZVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMuZGVsZXRlUGFsZXR0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIChlcnIsIGFycmF5KVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuICBnZW5lcmF0ZUdpZkNiKG9wdHMsIGNiKSB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSBjYiB8fCBvcHRzO1xuXG4gICAgdGhpcy5nZW5lcmF0ZUdpZihvcHRzKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkpXG4gICAgICAuY2F0Y2goY2FsbGJhY2spO1xuICB9XG59XG4iXX0=
