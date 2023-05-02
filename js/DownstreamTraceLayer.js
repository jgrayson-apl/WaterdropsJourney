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
 * DownstreamTraceLayer
 *  - Downstream Trace Layer
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/3/2021 - 0.0.1 -
 * Modified:
 *
 */

class DownstreamTraceLayer extends EventTarget {

  /**
   * @type {SceneView}
   */
  view;

  /**
   *
   * @type {number}
   */
  traceOffset = 40.0;

  /**
   *
   * @type {string}
   * @private
   */
  _orange = '#F9A845';

  /**
   *
   * @type {string}
   * @private
   */
  _blue = '#227AC7';

  /**
   *
   * @type {string}
   * @private
   */
  _cyan = '#00ffff';

  /**
   *
   * @type {string}
   * @private
   */
  _white = '#efefef';

  /**
   *
   * @param {SceneView|MapView} view
   */
  constructor({view}) {
    super();

    this.view = view;
    this._initialize();

  }

  /**
   *
   * @private
   */
  _initialize() {
    require([
      'esri/Graphic',
      'esri/layers/GraphicsLayer'
    ], (Graphic, GraphicsLayer) => {

      //
      // TRACE RESULTS //
      //
      const traceSymbol = (this.view.type === '3d')
        ? {
          type: "line-3d",
          symbolLayers: [
            {
              type: "line",
              size: 3.5,
              material: {color: this._orange},
              cap: "round",
              join: "round"
            }
            /*,
             {
             type: "path",
             profile: "circle",
             cap: "round",
             width: this.traceOffset,
             height: this.traceOffset,
             material: {color: this._orange}
             }*/
          ]
        }
        : {
          type: "simple-line",
          color: this._orange,
          width: 2.5
        };

      /*const traceCameraSymbol = (this.view.type === '3d')
        ? {
          type: "line-3d",
          symbolLayers: [
            {
              type: "line",
              size: 3,
              material: {color: this._cyan},
              cap: "round",
              join: "round"
            }
            /!*,
             {
             type: "path",
             profile: "circle",
             cap: "round",
             width: this.traceOffset,
             height: this.traceOffset,
             material: {color: this._cyan}
             }*!/
          ]
        }
        : {
          type: "simple-line",
          color: this._orange,
          width: 2.5
        };*/

      this.traceGraphic = new Graphic({symbol: traceSymbol});
      //this.traceCameraGraphic = new Graphic({symbol: traceCameraSymbol});

      this.resultsLayer = new GraphicsLayer({
        title: 'Downstream Trace Results',
        elevationInfo: {mode: 'relative-to-ground', offset: this.traceOffset},
        graphics: [this.traceGraphic]
      });

      //
      // START LOCATION //
      //
      const startLocationSymbol = (this.view.type === '3d')
        ? {
          type: "point-3d",
          symbolLayers: [
            {
              type: "text",
              text: 'source',
              size: 11,
              font: {weight: 'bold'},
              material: {color: this._orange},
              halo: {color: this._white, size: 1.2}
            }
          ],
          verticalOffset: {
            screenLength: 80,
            maxWorldLength: 2000,
            minWorldLength: 200
          },
          callout: {
            type: "line",
            size: 1.0,
            color: this._white,
            border: {color: this._orange}
          }
        }
        : {
          type: "simple-marker",
          style: "circle",
          color: this._white,
          size: 7,
          outline: {color: this._orange, width: 1.2}
        };

      this.startLocationGraphic = new Graphic({symbol: startLocationSymbol});

      //
      // TARGET LOCATION //
      //
      const targetSymbol = (this.view.type === '3d')
        ? {
          type: "polygon-3d",
          symbolLayers: [
            /*{
             type: "object",
             width: 125,
             anchor: 'relative',
             anchorPosition: {x: 0.0, y: 0.0, z: -1.0},
             resource: {primitive: "sphere"},
             material: {color: this._blue}
             },
             {
             type: "object",
             width: 250,
             anchor: 'bottom',
             resource: {primitive: "sphere"},
             material: {color: this._white_a}
             }*/
          ]
        }
        : {
          type: "simple-marker",
          style: "circle",
          color: this._blue,
          size: 9,
          outline: {color: this._white, width: 1.2}
        };

      this.targetLocationGraphic = new Graphic({symbol: targetSymbol});

      const startTargetLayer = new GraphicsLayer({
        title: 'Trace Downstream',
        elevationInfo: {mode: 'on-the-ground'},
        graphics: [this.startLocationGraphic, this.targetLocationGraphic]
      });

      if (this.view.type === '3d') {
        this.view.map.addMany([this.resultsLayer, startTargetLayer]);
      } else {
        this.view.map.basemap.referenceLayers.addMany([this.resultsLayer, startTargetLayer]);
      }

    });
  }

  /**
   *
   * @param {boolean} enabled
   */
  /*toggleCameraPath() {
   const includes = this.resultsLayer.graphics.includes(this.traceCameraGraphic);
   if (includes) {
   this.resultsLayer.remove(this.traceCameraGraphic);
   } else {
   this.resultsLayer.add(this.traceCameraGraphic);
   }
   }*/

  /**
   *
   * @param {Polyline} [cameraPath]
   */

  /*setCameraPath(cameraPath) {
   this.traceCameraGraphic.geometry = cameraPath;
   }*/

  /**
   *
   */
  clearAll() {
    this.traceGraphic.geometry = null;
    //this.traceCameraGraphic.geometry = null;
    this.startLocationGraphic.geometry = null;
    this.targetLocationGraphic.geometry = null;
  }

  /**
   *
   * @param {Polyline} [traceResult]
   */
  setTraceResult(traceResult) {
    this.traceGraphic.geometry = traceResult;
  }

  /**
   *
   * @param {Point} [location]
   */
  setStartLocation(location) {
    this.startLocationGraphic.geometry = location;
  }

  /**
   *
   * @param {Point} [location]
   */
  setTargetLocation(location) {
    this.targetLocationGraphic.geometry = location;
  }

}

export default DownstreamTraceLayer;

