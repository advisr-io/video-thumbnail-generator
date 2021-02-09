'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fluentFfmpeg = require('fluent-ffmpeg');

var _fluentFfmpeg2 = _interopRequireDefault(_fluentFfmpeg);

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
        return Promise.reject(new Error('Percent must be a value from 0-100'));
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

      return new Promise(function (resolve, reject) {
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

      return new Promise(function (resolve, reject) {
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

        return new Promise(function (resolve, reject) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIlRodW1ibmFpbEdlbmVyYXRvciIsIm9wdHMiLCJzb3VyY2VQYXRoIiwidGh1bWJuYWlsUGF0aCIsInBlcmNlbnQiLCJsb2dnZXIiLCJzaXplIiwiZmlsZU5hbWVGb3JtYXQiLCJ0bXBEaXIiLCJGZm1wZWdDb21tYW5kIiwiZGVsIiwic291cmNlIiwiUHJvbWlzZSIsInJlamVjdCIsIkVycm9yIiwiZ2VuZXJhdGUiLCJfIiwiYXNzaWduSW4iLCJjb3VudCIsInRpbWVzdGFtcHMiLCJ0aGVuIiwicmVzdWx0IiwicG9wIiwiY2IiLCJjYWxsYmFjayIsImdlbmVyYXRlT25lQnlQZXJjZW50IiwiY2F0Y2giLCJkZWZhdWx0U2V0dGluZ3MiLCJmb2xkZXIiLCJmaWxlbmFtZSIsImZmbXBlZyIsImdldEZmbXBlZ0luc3RhbmNlIiwic2V0dGluZ3MiLCJmaWxlbmFtZUFycmF5IiwicmVzb2x2ZSIsImNvbXBsZXRlIiwiZmlsZW5hbWVzIiwiZm5zIiwib24iLCJzY3JlZW5zaG90cyIsImRlZmF1bHRPcHRzIiwidmlkZW9GaWx0ZXJzIiwiY29uZiIsImlucHV0T3B0aW9ucyIsIm91dHB1dE9wdGlvbnMiLCJvdXRwdXQiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwicHVzaCIsImR1cmF0aW9uIiwicnVuIiwiZ2VuZXJhdGVQYWxldHRlIiwiZnBzIiwic2NhbGUiLCJzcGVlZE11bHRpcGxpZXIiLCJkZWxldGVQYWxldHRlIiwib3V0cHV0RmlsZU5hbWUiLCJmaWxlTmFtZSIsImQiLCJjcmVhdGVHaWYiLCJwYWxldHRlRmlsZVBhdGgiLCJ1bnNoaWZ0Iiwic3luYyIsImZvcmNlIiwiZ2VuZXJhdGVHaWYiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7OztBQUVBOzs7SUFHcUJBLGtCO0FBQ25COzs7Ozs7Ozs7QUFTQSw4QkFBWUMsSUFBWixFQUFrQjtBQUFBOztBQUNoQixTQUFLQyxVQUFMLEdBQWtC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QUF1QixJQUEzQixFQUFpQztBQUMvQkcsZ0JBQUVJLElBQUYsQ0FBTyxDQUFDRixlQUFELENBQVAsRUFBMEI7QUFDeEJHLHVCQUFPO0FBRGlCLGVBQTFCO0FBR0Q7QUFDRDlCLG9CQUFRVyxNQUFSO0FBQ0Q7O0FBRURmLGlCQUNHYSxZQURILENBQ2dCQSxZQURoQixFQUVHQyxhQUZILENBRWlCQSxhQUZqQixFQUdHTixFQUhILENBR00sS0FITixFQUdhSCxRQUhiLEVBSUdHLEVBSkgsQ0FJTSxPQUpOLEVBSWV6QixNQUpmLEVBS0dnQyxNQUxILENBS1VBLE1BTFYsRUFNR00sR0FOSDtBQU9ELFNBbkJNLENBQVA7QUFvQkQ7O0FBRUQsYUFBTyxLQUFLQyxlQUFMLEdBQ0poQyxJQURJLENBQ0N3QyxTQURELENBQVA7QUFFRDs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7OztrQ0FhYzNELEksRUFBTXNCLEUsRUFBSTtBQUN0QixVQUFNQyxXQUFXRCxNQUFNdEIsSUFBdkI7O0FBRUEsV0FBS2dFLFdBQUwsQ0FBaUJoRSxJQUFqQixFQUNHbUIsSUFESCxDQUNRLFVBQUNDLE1BQUQ7QUFBQSxlQUFZRyxTQUFTLElBQVQsRUFBZUgsTUFBZixDQUFaO0FBQUEsT0FEUixFQUVHSyxLQUZILENBRVNGLFFBRlQ7QUFHRDs7Ozs7O2tCQTdUa0J4QixrQiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBGZm1wZWdDb21tYW5kIGZyb20gJ2ZsdWVudC1mZm1wZWcnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBkZWwgZnJvbSAnZGVsJztcblxuLyoqXG4gKiBAY2xhc3MgVGh1bWJuYWlsR2VuZXJhdG9yXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRodW1ibmFpbEdlbmVyYXRvciB7XG4gIC8qKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnNvdXJjZVBhdGhdIC0gJ2Z1bGwgcGF0aCB0byB2aWRlbyBmaWxlJ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMudGh1bWJuYWlsUGF0aF0gLSAncGF0aCB0byB3aGVyZSB0aHVtYm5haWwocykgc2hvdWxkIGJlIHNhdmVkJ1xuICAgKiBAcGFyYW0ge051bWJlcn0gW29wdHMucGVyY2VudF1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnNpemVdXG4gICAqIEBwYXJhbSB7TG9nZ2VyfSBbb3B0cy5sb2dnZXJdXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5zb3VyY2VQYXRoID0gb3B0cy5zb3VyY2VQYXRoO1xuICAgIHRoaXMudGh1bWJuYWlsUGF0aCA9IG9wdHMudGh1bWJuYWlsUGF0aDtcbiAgICB0aGlzLnBlcmNlbnQgPSBgJHtvcHRzLnBlcmNlbnR9JWAgfHwgJzkwJSc7XG4gICAgdGhpcy5sb2dnZXIgPSBvcHRzLmxvZ2dlciB8fCBudWxsO1xuICAgIHRoaXMuc2l6ZSA9IG9wdHMuc2l6ZSB8fCAnMzIweDI0MCc7XG4gICAgdGhpcy5maWxlTmFtZUZvcm1hdCA9ICclYi10aHVtYm5haWwtJXItJTAwMGknO1xuICAgIHRoaXMudG1wRGlyID0gb3B0cy50bXBEaXIgfHwgJy90bXAnO1xuXG4gICAgLy8gYnkgaW5jbHVkZSBkZXBzIGhlcmUsIGl0IGlzIGVhc2llciB0byBtb2NrIHRoZW0gb3V0XG4gICAgdGhpcy5GZm1wZWdDb21tYW5kID0gRmZtcGVnQ29tbWFuZDtcbiAgICB0aGlzLmRlbCA9IGRlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWV0aG9kIGdldEZmbXBlZ0luc3RhbmNlXG4gICAqXG4gICAqIEByZXR1cm4ge0ZmbXBlZ0NvbW1hbmR9XG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRGZm1wZWdJbnN0YW5jZSgpIHtcbiAgICByZXR1cm4gbmV3IHRoaXMuRmZtcGVnQ29tbWFuZCh7XG4gICAgICBzb3VyY2U6IHRoaXMuc291cmNlUGF0aCxcbiAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIG9uZSB0aHVtYm5haWwgYnkgYmVpbmcgZ2l2ZW4gYSBwZXJjZW50YWdlIHZhbHVlLlxuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlT25lQnlQZXJjZW50XG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJjZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5mb2xkZXJdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zaXplXSAtICdpLmUuIDMyMHgzMjAnXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5maWxlbmFtZV1cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKlxuICAgKiBAYXN5bmNcbiAgICovXG4gIGdlbmVyYXRlT25lQnlQZXJjZW50KHBlcmNlbnQsIG9wdHMpIHtcbiAgICBpZiAocGVyY2VudCA8IDAgfHwgcGVyY2VudCA+IDEwMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignUGVyY2VudCBtdXN0IGJlIGEgdmFsdWUgZnJvbSAwLTEwMCcpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZShfLmFzc2lnbkluKG9wdHMsIHtcbiAgICAgIGNvdW50OiAxLFxuICAgICAgdGltZXN0YW1wczogW2Ake3BlcmNlbnR9JWBdLFxuICAgIH0pKVxuICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gcmVzdWx0LnBvcCgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgb25lIHRodW1ibmFpbCBieSBiZWluZyBnaXZlbiBhIHBlcmNlbnRhZ2UgdmFsdWUuXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVPbmVCeVBlcmNlbnRDYlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gcGVyY2VudFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdHNdXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIChlcnIsIHN0cmluZylcbiAgICpcbiAgICogQHJldHVybiB7Vm9pZH1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKlxuICAgKiBAYXN5bmNcbiAgICovXG4gIGdlbmVyYXRlT25lQnlQZXJjZW50Q2IocGVyY2VudCwgb3B0cywgY2IpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNiIHx8IG9wdHM7XG5cbiAgICB0aGlzLmdlbmVyYXRlT25lQnlQZXJjZW50KHBlcmNlbnQsIG9wdHMpXG4gICAgICAudGhlbigocmVzdWx0KSA9PiBjYWxsYmFjayhudWxsLCByZXN1bHQpKVxuICAgICAgLmNhdGNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgdGh1bWJuYWlsc1xuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5mb2xkZXJdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0cy5jb3VudF1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnNpemVdIC0gJ2kuZS4gMzIweDMyMCdcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZpbGVuYW1lXVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqXG4gICAqIEBhc3luY1xuICAgKi9cbiAgZ2VuZXJhdGUob3B0cykge1xuICAgIGNvbnN0IGRlZmF1bHRTZXR0aW5ncyA9IHtcbiAgICAgIGZvbGRlcjogdGhpcy50aHVtYm5haWxQYXRoLFxuICAgICAgY291bnQ6IDEwLFxuICAgICAgc2l6ZTogdGhpcy5zaXplLFxuICAgICAgZmlsZW5hbWU6IHRoaXMuZmlsZU5hbWVGb3JtYXQsXG4gICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgIH07XG5cbiAgICBjb25zdCBmZm1wZWcgPSB0aGlzLmdldEZmbXBlZ0luc3RhbmNlKCk7XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBfLmFzc2lnbkluKGRlZmF1bHRTZXR0aW5ncywgb3B0cyk7XG4gICAgbGV0IGZpbGVuYW1lQXJyYXkgPSBbXTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgcmVzb2x2ZShmaWxlbmFtZUFycmF5KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmlsZW5hbWVzKGZucykge1xuICAgICAgICBmaWxlbmFtZUFycmF5ID0gZm5zO1xuICAgICAgfVxuXG4gICAgICBmZm1wZWdcbiAgICAgICAgLm9uKCdmaWxlbmFtZXMnLCBmaWxlbmFtZXMpXG4gICAgICAgIC5vbignZW5kJywgY29tcGxldGUpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAgIC5zY3JlZW5zaG90cyhzZXR0aW5ncyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIHRodW1ibmFpbHNcbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZUNiXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5mb2xkZXJdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0cy5jb3VudF1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnNpemVdIC0gJ2kuZS4gMzIweDMyMCdcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZpbGVuYW1lXVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIChlcnIsIGFycmF5KVxuICAgKlxuICAgKiBAcmV0dXJuIHtWb2lkfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqXG4gICAqIEBhc3luY1xuICAgKi9cbiAgZ2VuZXJhdGVDYihvcHRzLCBjYikge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gY2IgfHwgb3B0cztcblxuICAgIHRoaXMuZ2VuZXJhdGUob3B0cylcbiAgICAgIC50aGVuKChyZXN1bHQpID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkpXG4gICAgICAuY2F0Y2goY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSB0aGUgcGFsZXR0ZSBmcm9tIGEgdmlkZW8gKHJlcXVpcmVkIGZvciBjcmVhdGluZyBnaWZzKVxuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlUGFsZXR0ZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMudmlkZW9GaWx0ZXJzXVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMub2Zmc2V0XVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMuZHVyYXRpb25dXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy52aWRlb0ZpbHRlcnNdXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIGdlbmVyYXRlUGFsZXR0ZShvcHRzKSB7XG4gICAgY29uc3QgZmZtcGVnID0gdGhpcy5nZXRGZm1wZWdJbnN0YW5jZSgpO1xuICAgIGNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgICAgdmlkZW9GaWx0ZXJzOiAnZnBzPTEwLHNjYWxlPTMyMDotMTpmbGFncz1sYW5jem9zLHBhbGV0dGVnZW4nLFxuICAgIH07XG4gICAgY29uc3QgY29uZiA9IF8uYXNzaWduSW4oZGVmYXVsdE9wdHMsIG9wdHMpO1xuICAgIGNvbnN0IGlucHV0T3B0aW9ucyA9IFtcbiAgICAgICcteScsXG4gICAgXTtcbiAgICBjb25zdCBvdXRwdXRPcHRpb25zID0gW1xuICAgICAgYC12ZiAke2NvbmYudmlkZW9GaWx0ZXJzfWAsXG4gICAgXTtcbiAgICBjb25zdCBvdXRwdXQgPSBgJHt0aGlzLnRtcERpcn0vcGFsZXR0ZS0ke0RhdGUubm93KCl9LnBuZ2A7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgIHJlc29sdmUob3V0cHV0KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYub2Zmc2V0KSB7XG4gICAgICAgIGlucHV0T3B0aW9ucy5wdXNoKGAtc3MgJHtjb25mLm9mZnNldH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZHVyYXRpb24pIHtcbiAgICAgICAgaW5wdXRPcHRpb25zLnB1c2goYC10ICR7Y29uZi5kdXJhdGlvbn1gKTtcbiAgICAgIH1cblxuICAgICAgZmZtcGVnXG4gICAgICAgIC5pbnB1dE9wdGlvbnMoaW5wdXRPcHRpb25zKVxuICAgICAgICAub3V0cHV0T3B0aW9ucyhvdXRwdXRPcHRpb25zKVxuICAgICAgICAub24oJ2VuZCcsIGNvbXBsZXRlKVxuICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KVxuICAgICAgICAub3V0cHV0KG91dHB1dClcbiAgICAgICAgLnJ1bigpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSB0aGUgcGFsZXR0ZSBmcm9tIGEgdmlkZW8gKHJlcXVpcmVkIGZvciBjcmVhdGluZyBnaWZzKVxuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlUGFsZXR0ZUNiXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy52aWRlb0ZpbHRlcnNdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy5vZmZzZXRdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy5kdXJhdGlvbl1cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRzLnZpZGVvRmlsdGVyc11cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSAoZXJyLCBhcnJheSlcbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbiAgZ2VuZXJhdGVQYWxldHRlQ2Iob3B0cywgY2IpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNiIHx8IG9wdHM7XG5cbiAgICB0aGlzLmdlbmVyYXRlUGFsZXR0ZShvcHRzKVxuICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gY2FsbGJhY2sobnVsbCwgcmVzdWx0KSlcbiAgICAgIC5jYXRjaChjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGNyZWF0ZSBhIHNob3J0IGdpZiB0aHVtYm5haWwgZnJvbSBhbiBtcDQgdmlkZW9cbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZUdpZlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5mcHNcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuc2NhbGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuc3BlZWRNdWx0aXBsZVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMuZGVsZXRlUGFsZXR0ZVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAcHVibGljXG4gICAqL1xuICBnZW5lcmF0ZUdpZihvcHRzKSB7XG4gICAgY29uc3QgZmZtcGVnID0gdGhpcy5nZXRGZm1wZWdJbnN0YW5jZSgpO1xuICAgIGNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgICAgZnBzOiAwLjc1LFxuICAgICAgc2NhbGU6IDE4MCxcbiAgICAgIHNwZWVkTXVsdGlwbGllcjogNCxcbiAgICAgIGRlbGV0ZVBhbGV0dGU6IHRydWUsXG4gICAgfTtcbiAgICBjb25zdCBjb25mID0gXy5hc3NpZ25JbihkZWZhdWx0T3B0cywgb3B0cyk7XG4gICAgY29uc3QgaW5wdXRPcHRpb25zID0gW107XG4gICAgY29uc3Qgb3V0cHV0T3B0aW9ucyA9IFtgLWZpbHRlcl9jb21wbGV4IGZwcz0ke2NvbmYuZnBzfSxzZXRwdHM9KDEvJHtjb25mLnNwZWVkTXVsdGlwbGllcn0pKlBUUyxzY2FsZT0ke2NvbmYuc2NhbGV9Oi0xOmZsYWdzPWxhbmN6b3NbeF07W3hdWzE6dl1wYWxldHRldXNlYF07XG4gICAgY29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBjb25mLmZpbGVOYW1lIHx8IGB2aWRlby0ke0RhdGUubm93KCl9LmdpZmA7XG4gICAgY29uc3Qgb3V0cHV0ID0gYCR7dGhpcy50aHVtYm5haWxQYXRofS8ke291dHB1dEZpbGVOYW1lfWA7XG4gICAgY29uc3QgZCA9IHRoaXMuZGVsO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlR2lmKHBhbGV0dGVGaWxlUGF0aCkge1xuICAgICAgaWYgKGNvbmYub2Zmc2V0KSB7XG4gICAgICAgIGlucHV0T3B0aW9ucy5wdXNoKGAtc3MgJHtjb25mLm9mZnNldH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZHVyYXRpb24pIHtcbiAgICAgICAgaW5wdXRPcHRpb25zLnB1c2goYC10ICR7Y29uZi5kdXJhdGlvbn1gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgb3V0cHV0T3B0aW9ucy51bnNoaWZ0KGAtaSAke3BhbGV0dGVGaWxlUGF0aH1gKTtcblxuICAgICAgICBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgICBpZiAoY29uZi5kZWxldGVQYWxldHRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBkLnN5bmMoW3BhbGV0dGVGaWxlUGF0aF0sIHtcbiAgICAgICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmZtcGVnXG4gICAgICAgICAgLmlucHV0T3B0aW9ucyhpbnB1dE9wdGlvbnMpXG4gICAgICAgICAgLm91dHB1dE9wdGlvbnMob3V0cHV0T3B0aW9ucylcbiAgICAgICAgICAub24oJ2VuZCcsIGNvbXBsZXRlKVxuICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAgICAgLm91dHB1dChvdXRwdXQpXG4gICAgICAgICAgLnJ1bigpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVQYWxldHRlKClcbiAgICAgIC50aGVuKGNyZWF0ZUdpZik7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGNyZWF0ZSBhIHNob3J0IGdpZiB0aHVtYm5haWwgZnJvbSBhbiBtcDQgdmlkZW9cbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZUdpZkNiXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmZwc1xuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5zY2FsZVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5zcGVlZE11bHRpcGxlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5kZWxldGVQYWxldHRlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gKGVyciwgYXJyYXkpXG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIGdlbmVyYXRlR2lmQ2Iob3B0cywgY2IpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNiIHx8IG9wdHM7XG5cbiAgICB0aGlzLmdlbmVyYXRlR2lmKG9wdHMpXG4gICAgICAudGhlbigocmVzdWx0KSA9PiBjYWxsYmFjayhudWxsLCByZXN1bHQpKVxuICAgICAgLmNhdGNoKGNhbGxiYWNrKTtcbiAgfVxufVxuIl19
