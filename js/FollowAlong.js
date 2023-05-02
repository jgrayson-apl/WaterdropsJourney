/*
 Copyright 2021 Esri

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

import ViewLoading from './apl/ViewLoading.js';

/**
 *
 * FollowAlong
 *  - Follow Along
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  11/22/2021 - 0.0.1 -
 * Modified:
 *
 */

class FollowAlong extends EventTarget {

  static version = '0.0.1';

  /**
   *
   * @type {{duration: number}}
   */
  resetGoToOptions = {duration: 5000};

  /**
   *
   * @type {number}
   */
  playbackStepIntervalMeters = 100.0;

  /**
   *
   * @type {number}
   */
  playbackPauseIntervalSteps = 500;

  /**
   * GENERALIZATION DISTANCE
   *
   * @type {number}
   */
  generalizedDistanceKms = 1.8;

  /**
   * LOOK AHEAD POINT INDEX OFFSET
   *
   * @type {number}
   */
  pointIdxOffset = 75;

  /**
   * CAMERA OFFSET FROM POSITION
   *
   * @type {number}
   */
  positionXYOffset = 15000;
  positionZOffset = 6000;
  positionTilt = 70.0;

  /**
   * ARE WE CURRENTLY FOLLOWING
   *
   * @type {boolean}
   * @private
   */
  _following = false;
  set following(value) {
    this._following = value;
    this.dispatchEvent(new CustomEvent('following-change', {detail: {following: this._following}}));
  }

  /**
   *
   * @returns {boolean}
   */
  get following() {
    return this._following;
  }

  /**
   *
   * @type {number}
   * @private
   */
  _followAlongIndex = -1;

  /**
   * @type {{target,camera}[]}
   * @private
   */
  _followAlongParams;

  /**
   * @type {SceneView}
   */
  view;

  /**
   * @type {boolean}
   */
  loop;

  /**
   *
   * @param {SceneView} view
   */
  constructor({view}) {
    super();

    this.view = view;
    this.loop = false;
    this.initialViewpoint = view.viewpoint.clone();

    this.viewLoading = new ViewLoading({view: this.view, enabled: false});
    this.view.ui.add(this.viewLoading, 'bottom-right');

    this.initializeFollowParams();

    this._followAlong = this._followAlong.bind(this);

  }

  /**
   *
   */
  async reset() {
    // INITIAL PARAMS //
    this.following = false;
    this._followAlongIndex = 0;
    // INITIAL LOCATION AND ANALYSIS //
    return this._goToFollowLocation2();
  }

  /**
   *
   * @param {Boolean} active
   */
  play({active}) {

    this.following = active;
    if (active) {
      this.dispatchEvent(new CustomEvent('journey-start', {}));
      requestAnimationFrame(this._followAlong);
    }

  }

  /**
   *
   */
  clear() {
    this.following = false;
    this.view.goTo(this.initialViewpoint, this.resetGoToOptions);
  }

  /**
   *
   * @returns {*|boolean}
   * @private
   */
  _updateFollowParamIndex() {
    return this._followAlongParams && this._followAlongParams.length && (++this._followAlongIndex < (this._followAlongParams.length - 1));
  };

  /**
   *
   * @private
   */
  _followAlong() {
    require(['esri/core/reactiveUtils'], (reactiveUtils) => {

      if (this.following && this._updateFollowParamIndex()) {

        if (this._followAlongIndex % this.playbackPauseIntervalSteps === 0) {
          this.viewLoading.enabled = true;
          this.view.focus();
          reactiveUtils.once(() => !this.view.updating).then(() => {
            this.viewLoading.enabled = false;
            this._goToFollowLocation();
            requestAnimationFrame(this._followAlong);
          }, {initial: false});
        } else {
          this._goToFollowLocation();
          requestAnimationFrame(this._followAlong);
        }

      } else {
        if (this._followAlongIndex >= (this._followAlongParams.length - 1)) {

          if (this.loop) {
            this.dispatchEvent(new CustomEvent('loop-complete', {}));
            setTimeout(() => {
              this.reset().then(() => {
                setTimeout(() => {
                  this.dispatchEvent(new CustomEvent('loop-restart', {}));
                  this.play({active: true});
                }, 2000);
              });
            }, 2000);
          } else {
            // AT END OF THE ANIMATION //
            this.following = false;
            this._followAlongIndex = 0;
            this.dispatchEvent(new CustomEvent('journey-complete', {}));
          }
        } else {
          // PAUSED...
        }
      }
    });
  }

  /**
   *
   * @private
   */
  _goToFollowLocation() {

    // CURRENT FOLLOW ALONG PARAMS //
    const followAlongParam = this._followAlongParams[this._followAlongIndex];

    // SET CAMERA //
    //this.view.camera = followAlongParam.camera;
    this.view.goTo(followAlongParam.camera);

    // TARGET CHANGE //
    this.dispatchEvent(new CustomEvent('target-change', {
      detail: {location: followAlongParam.target}
    }));

  }

  /**
   *
   * @private
   */
  async _goToFollowLocation2() {

    // CURRENT FOLLOW ALONG PARAMS //
    const followAlongParam = this._followAlongParams[this._followAlongIndex];

    // GO TO CAMERA //
    return this.view.goTo(followAlongParam.camera).then(() => {
      // TARGET CHANGE //
      this.dispatchEvent(new CustomEvent('target-change', {
        detail: {location: followAlongParam.target, waitForUpdate: true}
      }));
    });

  }

  /**
   *
   * @param {Polyline} polyline
   * @return {{distanceTraveledMiles: number, startEndMiles: number, startZ: number, endZ: number}}
   */
  setSourcePolyline(polyline) {

    // FOLLOW ALONG PARAMETERS //
    this._followAlongParams = this._createFollowParams(polyline);

    // DISTANCES //
    const distancesMiles = this._getDistancesMiles(polyline);

    // RESET //
    this.reset();

    return distancesMiles;
  }

  /**
   *
   */
  initializeFollowParams() {
    require([
      'esri/geometry/Point',
      'esri/geometry/geometryEngine',
      'esri/geometry/support/geodesicUtils'
    ], (Point, geometryEngine, geodesicUtils) => {

      /**
       *
       * @param sourcePolyline
       * @return {{distanceTraveledMiles: number, startEndMiles: number, startZ: number, endZ: number}}
       * @private
       */
      this._getDistancesMiles = (sourcePolyline) => {
        const pointA = sourcePolyline.getPoint(0, 0);
        const pointB = sourcePolyline.getPoint(0, sourcePolyline.paths[0].length - 1);
        const startDD = new Point({x: pointA.longitude, y: pointA.latitude, spatialReference: {wkid: 4326}});
        const endDD = new Point({x: pointB.longitude, y: pointB.latitude, spatialReference: {wkid: 4326}});
        const {distance} = geodesicUtils.geodesicDistance(startDD, endDD, "miles");

        const startZ = this.view.groundView.elevationSampler.queryElevation(startDD).z;
        const endZ = this.view.groundView.elevationSampler.queryElevation(endDD).z;

        return {
          distanceTraveledMiles: geometryEngine.geodesicLength(sourcePolyline, 'miles'),
          startEndMiles: distance,
          startZ, endZ
        };
      };

      /**
       *
       * @param {Polyline} sourcePolyline
       * @returns {{target, camera}[]}
       */
      this._createFollowParams = (sourcePolyline) => {

        // DENSIFY //
        const denseFollowPolyline = geometryEngine.geodesicDensify(sourcePolyline, this.playbackStepIntervalMeters, 'meters');

        //
        // FOLLOW ALONG CAMERA PATH //
        //
        // GENERALIZED //
        let followAlongPolyline = geometryEngine.generalize(sourcePolyline, this.generalizedDistanceKms, false, 'kilometers');
        // SMOOTH //
        followAlongPolyline = this._smoothGeometry(followAlongPolyline);
        // DENSE //
        followAlongPolyline = geometryEngine.geodesicDensify(followAlongPolyline, this.playbackStepIntervalMeters, 'meters');

        //this.dispatchEvent(new CustomEvent('camera-path-change', {detail: {cameraPath: followAlongPolyline}}));

        // LAST VERTEX INDEX //
        const lastFollowVertexIndex = (followAlongPolyline.paths[0].length - 1);

        const alongCoords = followAlongPolyline.paths[0];
        return alongCoords.reduce((params, coords, coordsIdx) => {
          if (coordsIdx < lastFollowVertexIndex) {

            // NEXT TARGET //
            const currentPoint = new Point({spatialReference: followAlongPolyline.spatialReference, x: coords[0], y: coords[1]});
            const nextPoint = followAlongPolyline.getPoint(0, Math.min(lastFollowVertexIndex, (coordsIdx + this.pointIdxOffset)));

            // GET AZIMUTH //
            const startDD = new Point({x: currentPoint.longitude, y: currentPoint.latitude, spatialReference: {wkid: 4326}});
            const endDD = new Point({x: nextPoint.longitude, y: nextPoint.latitude, spatialReference: {wkid: 4326}});
            const {azimuth} = geodesicUtils.geodesicDistance(startDD, endDD, "meters");

            // POSITION BEHIND CURRENT LOCATION //
            let behindPositionDD = geodesicUtils.pointFromDistance(startDD, -this.positionXYOffset, azimuth);
            behindPositionDD.z = this.view.groundView.elevationSampler.queryElevation(behindPositionDD).z + this.positionZOffset;

            // NEAREST POINT ALONG RESULT PATH //
            const {coordinate} = geometryEngine.nearestVertex(denseFollowPolyline, currentPoint);

            // NEXT PARAMS //
            params.push({
              target: coordinate.clone(),
              camera: {
                heading: azimuth,
                tilt: this.positionTilt,
                position: behindPositionDD
              }
            });
          }

          return params;
        }, []);

      };
    });
  }

  /**
   *
   * Adapted from: https://github.com/stbaer/smooth-path/blob/master/index.js
   *               http://www.idav.ucdavis.edu/education/CAGDNotes/Chaikins-Algorithm/Chaikins-Algorithm.html
   *
   * @param {Polyline|Polygon} geometry
   * @param {number} iterationsCount
   * @param {boolean} [smoothZs]
   * @param {boolean} [smoothMs]
   * @returns {Polyline|Polygon}
   */
  _smoothGeometry(geometry, iterationsCount = 10, smoothZs = true, smoothMs = true) {

    let offsetFactor = 0.25;

    let smoothGeometry = geometry.clone();
    let geometryParts = (smoothGeometry.rings || smoothGeometry.paths);
    if (geometryParts) {

      let smoothParts = [];
      let smoothPart;
      let part;
      let firstCoord;
      let p0x, p0y, p0z, p0m, p1x, p1y, p1z, p1m;

      for (let partIndex = 0; partIndex < geometryParts.length; partIndex++) {
        part = geometryParts[partIndex];
        firstCoord = part[0];
        for (let iteration = 0; iteration < iterationsCount; iteration++) {
          smoothPart = [];
          for (let coordIndex = 0; coordIndex < (part.length - 1); coordIndex++) {

            p0x = part[coordIndex][0];
            p0y = part[coordIndex][1];
            p1x = part[coordIndex + 1][0];
            p1y = part[coordIndex + 1][1];

            smoothPart[coordIndex] = [
              ((1.0 - offsetFactor) * p0x + offsetFactor * p1x),
              ((1.0 - offsetFactor) * p0y + offsetFactor * p1y)
            ];
            smoothPart[coordIndex + 1] = [
              (offsetFactor * p0x + (1.0 - offsetFactor) * p1x),
              (offsetFactor * p0y + (1.0 - offsetFactor) * p1y)
            ];

            if (smoothZs && smoothGeometry.hasZ) {
              p0z = part[coordIndex][2] || 0.0;
              p1z = part[coordIndex + 1][2] || 0.0;
              smoothPart[coordIndex].push(((1.0 - offsetFactor) * p0z + offsetFactor * p1z));
              smoothPart[coordIndex + 1].push((offsetFactor * p0z + (1.0 - offsetFactor) * p1z));
            } else {
              smoothPart[coordIndex].push(part[coordIndex][2] || 0.0);
              smoothPart[coordIndex + 1].push(part[coordIndex + 1][2] || 0.0);
            }

            if (smoothMs && smoothGeometry.hasM) {
              p0m = part[coordIndex][3] || 0.0;
              p1m = part[coordIndex + 1][3] || 0.0;
              smoothPart[coordIndex].push(((1.0 - offsetFactor) * p0m + offsetFactor * p1m));
              smoothPart[coordIndex + 1].push((offsetFactor * p0m + (1.0 - offsetFactor) * p1m));
            } else {
              smoothPart[coordIndex].push(part[coordIndex][3] || 0.0);
              smoothPart[coordIndex + 1].push(part[coordIndex + 1][3] || 0.0);
            }

          }
          smoothPart.unshift(firstCoord);
          smoothPart.push(part[part.length - 1]);

          part = smoothPart;
        }
        smoothParts.push(smoothPart);
      }
      smoothGeometry[smoothGeometry.paths ? "paths" : "rings"] = smoothParts;
    } else {
      console.warn("smoothGeometry() only works with Polyline and Polygon geometry types; input geometry type: ", geometry.type);
    }

    return smoothGeometry;
  };

}

export default FollowAlong;
