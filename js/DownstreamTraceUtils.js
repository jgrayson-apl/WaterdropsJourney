/*
 Copyright 2020 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 *
 * DownstreamTraceUtils
 *  - Utility to do downstream Traces
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/2/2021 - 0.0.1 -
 * Modified:
 *
 * https://developers.arcgis.com/rest/elevation/api-reference/trace-downstream.htm
 *
 */

class DownstreamTraceUtils extends EventTarget {

  /**
   *
   * @type {string}
   */
  static DOWNSTREAM_TRACE_SOURCE_GP_URL = 'https://hydro.arcgis.com/arcgis/rest/services/Tools/Hydrology/GPServer/TraceDownstream/';

  /**
   *
   * @type {number}
   */
  static STATUS_WAIT_INTERVAL = 3500;

  /**
   * @type {SceneView}
   */
  view;

  /**
   * @type {boolean}
   */
  loop;

  /**
   * @type {Object}
   */
  submitOptions;

  /**
   * @type {{interval:number, statusCallback:Function}}
   */
  statusWaitOptions;

  /**
   * @type {Object}
   */
  resultOptions;

  /**
   *
   * @type {HTMLElement}
   */
  statusNotice = document.getElementById('status-notice');

  /**
   * @type {HTMLDivElement}
   */
  statusNoticeMessageNode;

  /**
   *
   * @param {SceneView} view
   */
  constructor({view}) {
    super();

    // VIEW //
    this.view = view;

    // SUBMIT OPTIONS //
    this.submitOptions = {};

    // STATUS WAIT OPTIONS //
    this.statusWaitOptions = {
      interval: DownstreamTraceUtils.STATUS_WAIT_INTERVAL,
      statusCallback: this.statusCallback.bind(this)
    };

    // RESULT OPTIONS //
    this.resultOptions = {
      outSpatialReference: this.view.spatialReference,
      returnM: true, // DOES NOT AFFECT THESE RESULTS //
      returnZ: true  // DOES NOT AFFECT THESE RESULTS //
    };

    // MESSAGE //
    this.statusNoticeMessageNode = this.statusNotice.querySelector('div[slot="message"]');

    // RESET //
    this.resetBtn = this.statusNotice.querySelector('.status-reset-btn');
    this.resetBtn.addEventListener('click', () => {
      this.reset();
      this.dispatchEvent(new CustomEvent('trace-result-reset', {detail: {}}));
    });

    // PLAY/PAUSE BUTTON //
    this.playBtn = this.statusNotice.querySelector('.status-play-btn');
    this.playBtn.addEventListener('click', () => {
      const playing = this.playBtn.toggleAttribute('playing');
      this.playBtn.setAttribute('icon', playing ? 'pause-f' : 'play-f');
      this.resetBtn.toggleAttribute('disabled', playing);
      this.dispatchEvent(new CustomEvent('trace-result-play', {detail: {active: playing}}));
    });

    this.loop = false;
    this.loopBtn = this.statusNotice.querySelector('.status-loop-btn');
    this.loopBtn.addEventListener('click', () => {
      this.loop = this.loopBtn.toggleAttribute('active');
      this.loopBtn.toggleAttribute('indicator', this.loop);
      this.dispatchEvent(new CustomEvent('trace-result-loop', {detail: {loop: this.loop}}));
    });

    // CLEAR BUTTON //
    this.clearBtn = this.statusNotice.querySelector('.status-clear-btn');
    this.clearBtn.addEventListener('click', () => {
      this.playBtn.toggleAttribute('playing', false);
      this.playBtn.setAttribute('icon', 'play-f');
      this.resetBtn.toggleAttribute('disabled', true);
      this.dispatchEvent(new CustomEvent('trace-result-clear', {detail: {}}));
    });

    // STATUS NOTICE //
    this.view.ui.add(this.statusNotice, 'top-right');
    this.statusNotice.toggleAttribute('open', true);

    // UTILS //
    this.initializeUtils();
  }

  /**
   *
   * @param {JobInfo} jobInfo
   */
  statusCallback(jobInfo) {
    //console.log("Job Status:", jobInfo.jobStatus);
    this.statusNoticeMessageNode.innerHTML = `Status: ${ jobInfo.jobStatus.replace(/job-/, '').toLowerCase() }...`;
  }

  /**
   *
   * @param error
   */
  errorCallback(error) {
    //console.log("Job Error:", error);
    this.statusNotice.setAttribute('kind', 'danger');
    this.statusNotice.setAttribute('icon', 'exclamation-mark-circle');
    this.statusNoticeMessageNode.innerHTML = JSON.stringify(error);
    this.view.container.style.cursor = 'crosshair';
  }

  /**
   *
   * @param disabled
   */
  disable({disabled}) {
    this.resetBtn.toggleAttribute('disabled', disabled);
    this.playBtn.toggleAttribute('disabled', disabled);
    this.loopBtn.toggleAttribute('disabled', disabled);
    this.clearBtn.toggleAttribute('disabled', disabled);
  }

  /**
   *
   */
  clearResults() {
    this.resetBtn.toggleAttribute('disabled', true);
    this.playBtn.toggleAttribute('disabled', true);
    this.loopBtn.toggleAttribute('disabled', true);
    this.clearBtn.toggleAttribute('disabled', true);
    this.statusNotice.setAttribute('kind', 'brand');
    this.statusNotice.setAttribute('icon', 'utility-network-trace');
    this.statusNoticeMessageNode.innerHTML = `Click on the map to calculate a new waterdrop's journey`;
  }

  /**
   *
   */
  reset() {
    const playing = this.playBtn.toggleAttribute('playing', false);
    this.playBtn.setAttribute('icon', playing ? 'pause-f' : 'play-f');
    this.resetBtn.toggleAttribute('disabled', true);
  }

  /**
   *
   * @param {Point} location
   */
  startTrace({location}) {
    require([
      "esri/rest/geoprocessor"
    ], (geoprocessor) => {

      this.clearResults();

      const errorCallback = this.errorCallback.bind(this);

      this.statusNoticeMessageNode.innerHTML = 'Starting downstream trace...';

      const traceParams = {
        "InputPoints": this._createInputFS(location),
        'DataSourceResolution': 'Finest',
        "Generalize": true
      };

      this.view.container.style.cursor = 'wait';
      geoprocessor.submitJob(DownstreamTraceUtils.DOWNSTREAM_TRACE_SOURCE_GP_URL, traceParams, this.submitOptions).then((jobInfo) => {

        // JOB ID //
        const jobId = jobInfo.jobId;
        //console.info("Job Submitted:", jobId);
        this.statusNoticeMessageNode.innerHTML = 'Calculating downstream trace...';

        jobInfo.waitForJobCompletion(this.statusWaitOptions).then(() => {
          //console.info("Job Completed:", jobId);
          this.statusNoticeMessageNode.innerHTML = 'Retrieving results...';

          jobInfo.fetchResultData('OutputTraceLine', this.resultOptions).then(({value}) => {
            //console.info("Result FeatureSet Retrieved:", value.toJSON());
            this.statusNoticeMessageNode.innerHTML = 'Analysis complete.';

            if (value.features.length) {

              const traceResult = this._fixDownstreamTraceResults(location, value.features[0]);
              //console.info(traceResult.attributes)

              this.view.container.style.cursor = 'crosshair';
              this.statusNoticeMessageNode.innerHTML = `Use the 'Play' button to experience the waterdrop's journey`;
              this.playBtn.toggleAttribute('disabled', false);
              this.loopBtn.toggleAttribute('disabled', false);
              this.clearBtn.toggleAttribute('disabled', false);

              requestAnimationFrame(() => {
                this.dispatchEvent(new CustomEvent('trace-result-complete', {detail: {traceResult}}));
              });

            } else {
              errorCallback(new Error('No downstream trace results.'));
            }
          }).catch(errorCallback);
        }).catch(errorCallback);
      }).catch(errorCallback);

    });
  }

  /**
   *
   */
  initializeUtils() {
    require([
      "esri/rest/support/FeatureSet",
      'esri/geometry/geometryEngine',
      'esri/geometry/Polyline'
    ], (FeatureSet, geometryEngine, Polyline) => {

      /**
       *
       * @param location
       * @returns {FeatureSet}
       * @private
       */
      this._createInputFS = (location) => {
        return new FeatureSet({
          fields: [{name: 'ObjectId', type: 'oid'}],
          features: [
            {
              geometry: {
                type: 'point',
                spatialReference: {wkid: this.view.spatialReference.wkid},
                x: location.x, y: location.y
              },
              attributes: {'ObjectId': 1}
            }
          ]
        });
      };

      /**
       *
       * @param {Polyline} polyline
       * @returns {Polyline[]}
       * @private
       */
      const _pathsToLines = (polyline) => {
        return polyline.paths.map(path => {
          return new Polyline({
            spatialReference: polyline.spatialReference,
            hasM: polyline.hasM, hasZ: polyline.hasZ,
            paths: [path]
          });
        });
      };

      /**
       *
       * @param {number[]} coordsA
       * @param {number[]} coordsB
       * @returns {boolean}
       * @private
       */
      const _sameCoords = (coordsA, coordsB) => {
        return ((coordsA[0] - coordsB[0]) + (coordsA[1] - coordsB[1])) < Number.EPSILON;
      };

      /**
       *
       * @param {Point} location - the location passed into the service
       * @param {Graphic} traceResult - the result Graphic returned by the service
       * @returns {Graphic} - the result Graphic with the fixed polyline
       * @private
       */
      this._fixDownstreamTraceResults = (location, traceResult) => {
        if (traceResult.geometry.paths.length > 1) {

          // TRACE POLYLINE //
          const tracePolyline = traceResult.geometry.clone();
          // CREATE POLYLINE FROM EACH PATH //
          const pathsAsPolylines = _pathsToLines(tracePolyline);
          /*resultsLayer.addMany(pathsAsPolylines.map(pathPolyline => {return {geometry: pathPolyline,symbol: createTestSymbol()}}));*/

          // CALCULATE PROXIMITY FROM PATHS TO SOURCE POINT //
          const proximityInfos = pathsAsPolylines.reduce((nearestInfos, pathPolyline, pathIdx) => {
            const nearestVertex = geometryEngine.nearestVertex(pathPolyline, location);
            nearestVertex.pathIdx = pathIdx; // KEEP TRACK OF SOURCE PATH INDEX //
            return nearestInfos.concat(nearestVertex);
          }, []);

          // SORT PATHS BASED ON DISTANCE TO SOURCE POINT //
          proximityInfos.sort((a, b) => { return (a.distance - b.distance); });

          // ORGANIZE PATHS //
          const allFixedParts = proximityInfos.reduce((allCoords, proximityInfo) => {
            // SOURCE COORDINATES //
            const coords = tracePolyline.paths[proximityInfo.pathIdx];
            // MORE THAN TWO POINTS IN A LINE //
            if (coords.length > 2) {
              // REVERSE VERTEX ORDER IF NEAREST VERTEX IS NOT FIRST ONE //
              const fixedCoords = (proximityInfo.vertexIndex > 0) ? coords.reverse() : coords;
              // IF WE HAVE A PREVIOUS PATH //
              if (allCoords.length) {
                // IS CURRENT PATH ADJACENT TO PREVIOUS PATH //
                const prevCoords = allCoords[allCoords.length - 1];
                if (_sameCoords(fixedCoords[0], prevCoords[prevCoords.length - 1])) {
                  // ADD COORDS TO PREVIOUS PATH //
                  prevCoords.push(...fixedCoords);
                } else { allCoords.push(fixedCoords); }
              } else { allCoords.push(fixedCoords); }
            } else { /* WE'RE GOING TO IGNORE ALL TWO POINT LINES... */}
            return allCoords;
          }, []);

          console.assert(allFixedParts.length === 1, 'MULTI-PART RESULT: ', allFixedParts);
          if (allFixedParts.length > 1) {
            // TODO: ELIMINATE SHORTER PATH...
          }

          // UPDATE RESULT GRAPHIC GEOMETRY //
          traceResult.set({
            geometry: new Polyline({
              spatialReference: tracePolyline.spatialReference,
              hasM: tracePolyline.hasM, hasZ: tracePolyline.hasZ,
              paths: allFixedParts
            })
          });
        }

        // RETURN RESULT GRAPHIC //
        return traceResult;
      };

    });
  }

}

export default DownstreamTraceUtils;


