/*
 Copyright 2022 Esri

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
 *  Waterdrop’s Journey
 *
 *   The app goes into motion, following the waterdrop’s downstream journey
 *
 *    At each change in watershed, the app pauses to show the key demographics of that watershed
 *
 *    Show key demographics for a 10 mile buffer either side of the current river segment
 *
 *    Show the sum total of key demographics since the water drop’s journey began. How many people
 *    did it pass within 10 miles of its path? How many farms? How many businesses?
 *
 */

/**
 ENRICH_FID: 739
 GlobalID: "7fb65bd2-ee02-4062-bfb0-ff465d9b80f5"
 HUC10: "0314030101"
 HUTYPE: "S"
 HasData: 1
 ID: "38"
 NAME: "Headwaters Conecuh River"
 OBJECTID: 739
 S01_BUS: 171
 S02_BUS: 10
 TOTPOP_CY: 5698
 aggregationMethod: "BlockApportionment:US.BlockGroups"
 apportionmentConfidence: 2.576
 populationToPolygonSizeRating: 2.191
 sourceCountry: "US"
 */

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';
import DownstreamTraceLayer from './DownstreamTraceLayer.js';
import DownstreamTraceUtils from './DownstreamTraceUtils.js';
import FollowAlong from './FollowAlong.js';

class Application extends AppBase {

  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // VIEW SHAREABLE URL PARAMETERS //
        this.initializeViewShareable({view});

        // USER SIGN-IN //
        this.configUserSignIn();

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').toggleAttribute('hidden', true);
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {

    const signInContainer = document.getElementById('sign-in-container');
    if (signInContainer) {
      const signIn = new SignIn({container: signInContainer, portal: this.portal});
    }

  }

  /**
   *
   * @param view
   */
  configView({view}) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/core/reactiveUtils',
          'esri/widgets/Popup',
          'esri/widgets/Home'
        ], (reactiveUtils, Popup, Home) => {

          // VIEW AND POPUP //
          view.set({
            constraints: {snapToZoom: false},
            qualityProfile: "medium",
            highlightOptions: {
              color: '#ffffff',
              fillOpacity: 0.2,
              haloColor: '#ffffff',
              haloOpacity: 0.9
            },
            popup: new Popup({
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            })
          });

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 0});

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView({view}).then(() => {

        // 2D OVERVIEW MAP //
        this.initializeOverview({view}).then(({overview2D}) => {

          // DOWNSTREAM TRACE LAYER //
          this.downstreamTraceLayer3D = new DownstreamTraceLayer({view});
          // DOWNSTREAM TRACE LAYER //
          this.downstreamTraceLayer2D = new DownstreamTraceLayer({view: overview2D});

          this.initializeTotalsCharts({view});
          this.initializeOverlayAnalysis({view});
          this.initializeDownstreamTrace({view});
          this.initializeFollowAlong({view});
          this.initializeUserLocation({view});

          resolve();
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   *
   * https://developers.arcgis.com/rest/elevation/api-reference/trace-downstream.htm
   *
   * @param view
   */
  initializeDownstreamTrace({view}) {

    // DOWNSTREAM TRACE UTILS //
    const downstreamTraceUtils = new DownstreamTraceUtils({view});

    // TRACE RESET //
    downstreamTraceUtils.addEventListener('trace-result-reset', ({detail: {}}) => {
      this.dispatchEvent(new CustomEvent('trace-result-reset', {detail: {}}));
    });
    // PLAY //
    downstreamTraceUtils.addEventListener('trace-result-play', ({detail: {active}}) => {
      this.dispatchEvent(new CustomEvent('trace-result-play', {detail: {active}}));
    });
    // LOOP //
    downstreamTraceUtils.addEventListener('trace-result-loop', ({detail: {loop}}) => {
      this.dispatchEvent(new CustomEvent('trace-result-loop', {detail: {loop}}));
    });
    // TRACE COMPLETE //
    downstreamTraceUtils.addEventListener('trace-result-complete', ({detail: {traceResult}}) => {
      this.dispatchEvent(new CustomEvent('trace-result-complete', {detail: {traceResult}}));
    });
    // CLEAR //
    downstreamTraceUtils.addEventListener('trace-result-clear', ({detail: {}}) => {
      this.dispatchEvent(new CustomEvent('trace-result-clear', {detail: {}}));
    });

    // LOCATION CHANGE //
    this.addEventListener("source-change", ({detail: {location}}) => {
      if (location) {
        downstreamTraceUtils.startTrace({location});
      } else {
        downstreamTraceUtils.clearResults();
      }
    });

    this.addEventListener('loop-complete', ({}) => {
      downstreamTraceUtils.disable({disabled: true});
    });
    this.addEventListener('loop-restart', ({}) => {
      downstreamTraceUtils.disable({disabled: false});
    });

    // JOURNEY COMPLETE //
    this.addEventListener("journey-complete", ({detail: {}}) => {
      downstreamTraceUtils.reset();
    });

  }

  /**
   *
   * @param view
   */
  initializeOverlayAnalysis({view}) {
    require([
      'esri/core/reactiveUtils',
      'esri/core/promiseUtils',
      'esri/widgets/Feature'
    ], (reactiveUtils, promiseUtils, Feature) => {

      // VISUALLY OFFSET NHD LAYERS //
      const nhdLayer = view.map.layers.find(l => l.title === 'National Hydrological Dataset');
      nhdLayer.loadAll().then(() => {
        nhdLayer.layers.forEach(subLayer => {
          subLayer.elevationInfo = {mode: 'relative-to-ground', offset: 5.0};
        });
      });

      // WATERSHED BOUNDARY LAYER //
      const watershedsLayer = view.map.allLayers.find(layer => layer.title === "Watershed Boundary Features");
      // FLOWLINES LAYER //
      const flowlinesLayer = view.map.allLayers.find(layer => { return (layer.title === "Flowlines"); });

      Promise.all([
        watershedsLayer.load(),
        flowlinesLayer.load()
      ]).then(() => {

        watershedsLayer.set({outFields: ["*"], popupEnabled: false});
        flowlinesLayer.set({outFields: ["*"], popupEnabled: false});

        const allHUC10sByOID = new Map();
        const huc10sFeature = new Feature({container: 'watershed-feature-container'});
        const flowlinesFeature = new Feature({container: 'river-feature-container'});

        const _updateOverlayAnalysis = ({location}) => {
          if (location) {

            view.hitTest(view.toScreen(location), {include: [watershedsLayer, flowlinesLayer]}).then(hitTestResponse => {
              hitTestResponse.results.forEach(hitResult => {

                const hitFeature = hitResult.graphic;
                switch (hitFeature?.layer?.id) {
                  case watershedsLayer.id:
                    // WATERSHED HIT //

                    const huc10FeatureOID = hitFeature.getObjectId();
                    if (!huc10sFeature.graphic || (huc10sFeature.graphic.getObjectId() !== huc10FeatureOID)) {
                      huc10sFeature.graphic = hitFeature;

                      if(!allHUC10sByOID.has(huc10FeatureOID)) {
                        this.updateCharts({
                          ...hitFeature.attributes,
                          previouslyCounted: allHUC10sByOID.has(huc10FeatureOID)
                        });
                      }

                      allHUC10sByOID.set(huc10FeatureOID, hitFeature);
                    }
                    break;

                  case flowlinesLayer.id:
                    // FLOWLINE HIT //
                    if (!flowlinesFeature.graphic || (flowlinesFeature.graphic.getObjectId() !== hitFeature.getObjectId())) {
                      flowlinesFeature.graphic = hitFeature;
                    }
                    break;
                }
              });

            });
          } else {
            huc10sFeature.graphic = null;
            flowlinesFeature.graphic = null;
          }
        };

        this.resetOverlayAnalysis = () => {
          allHUC10sByOID.clear();
          huc10sFeature.graphic = null;
          flowlinesFeature.graphic = null;
        };

        this.addEventListener("source-change", ({detail: {}}) => {
          this.resetOverlayAnalysis();
        });

        this.addEventListener('trace-result-reset', ({detail: {}}) => {
          this.resetOverlayAnalysis();
        });

        this.addEventListener('trace-result-clear', ({detail: {}}) => {
          this.resetOverlayAnalysis();
        });

        this.addEventListener('target-change', ({detail: {location}}) => {
          _updateOverlayAnalysis({location});
        });

      }).catch(console.error);
    });
  }

  /**
   *
   * @param view
   */
  initializeUserLocation({view}) {
    require([
      'esri/core/reactiveUtils'
    ], (reactiveUtils) => {

      view.container.style.cursor = 'wait';
      reactiveUtils.once(() => !view.updating).then(() => {
        view.container.style.cursor = 'crosshair';
      });

      view.on("click", (clickEvt) => {
        if (!this.followAlong.following) {

          this.downstreamTraceLayer2D.clearAll();
          this.downstreamTraceLayer3D.clearAll();

          this.clearDistanceLabels();
          this.clearCharts();
          this.followAlong.clear();

          this.dispatchEvent(new CustomEvent("source-change", {detail: {location: clickEvt.mapPoint}}));
        }
      });

    });
  }

  /**
   *
   * @param {SceneView} view
   * @return {Promise<{overview2D:MapView}>}
   */
  initializeOverview({view}) {
    return new Promise((resolve, reject) => {
      require([
        'esri/core/reactiveUtils',
        'esri/views/MapView'
      ], (reactiveUtils, MapView) => {

        const initialExtent = view.extent.clone();

        const overview2D = new MapView({
          container: 'overview-container',
          ui: {components: []},
          constraints: {snapToZoom: false},
          map: {basemap: view.map.basemap.clone()},
          extent: initialExtent
        });
        overview2D.when(() => {

          // REMOVE ALL REFERENCE LAYERS FROM THE BASEMAP IN THE 3D VIEW//
          view.map.basemap.referenceLayers.removeAll();

          this.addEventListener("source-change", ({detail: {location}}) => {
            this.downstreamTraceLayer2D.setStartLocation(location);
            this.downstreamTraceLayer3D.setStartLocation(location);
            overview2D.goTo(initialExtent);
          });
          this.addEventListener('trace-result-complete', ({detail: {traceResult}}) => {
            this.downstreamTraceLayer2D.setTraceResult(traceResult.geometry);
            this.downstreamTraceLayer3D.setTraceResult(traceResult.geometry);
            overview2D.goTo(traceResult.geometry.extent.clone().expand(1.1));
          });
          /*this.addEventListener('camera-path-change', ({detail: {cameraPath}}) => {
           this.downstreamTraceLayer3D.setCameraPath(cameraPath);
           this.downstreamTraceLayer2D.setCameraPath(cameraPath);
           });*/
          this.addEventListener('target-change', ({detail: {location}}) => {
            this.downstreamTraceLayer3D.setTargetLocation(location);
            this.downstreamTraceLayer2D.setTargetLocation(location);
          });
          this.addEventListener('trace-result-clear', ({detail: {}}) => {
            this.downstreamTraceLayer2D.clearAll();
            this.downstreamTraceLayer3D.clearAll();
            overview2D.goTo(initialExtent);
          });

          /*const cameraPathAction = document.getElementById('camera-path-action');
           cameraPathAction.addEventListener('click', () => {
           cameraPathAction.toggleAttribute('active');
           this.downstreamTraceLayer2D.toggleCameraPath();
           this.downstreamTraceLayer3D.toggleCameraPath();
           });*/

          resolve({overview2D});
        }).catch(reject);
      });
    });
  }

  /**
   *
   * @param view
   */
  initializeFollowAlong({view}) {

    // FOLLOW ALONG //
    this.followAlong = new FollowAlong({view});

    // this.followAlong.addEventListener('camera-path-change', ({detail: {cameraPath}}) => {
    //   this.dispatchEvent(new CustomEvent('camera-path-change', {detail: {cameraPath}}));
    // });

    // TARGET CHANGE //
    this.followAlong.addEventListener('target-change', ({detail: {location, waitForUpdate = false}}) => {
      // FOLLOW ALONG TARGET HAS CHANGED //
      this.dispatchEvent(new CustomEvent('target-change', {detail: {location, waitForUpdate}}));
    });

    // JOURNEY STARTED //
    this.followAlong.addEventListener('journey-start', ({}) => {
      // FOLLOW ALONG JOURNEY STARTED //
      this.dispatchEvent(new CustomEvent('journey-start', {detail: {}}));
    });

    // LOOP COMPLETE //
    this.followAlong.addEventListener('loop-complete', ({}) => {
      // FOLLOW ALONG LOOP COMPLETE //
      this.resetOverlayAnalysis();
      this.clearCharts();
      this.dispatchEvent(new CustomEvent('loop-complete', {detail: {}}));
    });

    this.followAlong.addEventListener('loop-restart', ({}) => {
      this.dispatchEvent(new CustomEvent('loop-restart', {detail: {}}));
    });

    // JOURNEY COMPLETE //
    this.followAlong.addEventListener('journey-complete', ({}) => {
      // FOLLOW ALONG JOURNEY COMPLETE //
      this.dispatchEvent(new CustomEvent('journey-complete', {detail: {}}));
    });

    let _traceResultFeature = null;

    // DISTANCES LABELS //
    const distanceTraveledLabel = document.getElementById('distance-traveled-label');
    const distanceStraightLabel = document.getElementById('distance-straight-label');
    const elevationChangeLabel = document.getElementById('elevation-change-label');
    const distanceFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    const metersToFeet = 3.28084;

    this.clearDistanceLabels = () => {
      distanceTraveledLabel.innerHTML = '';
      distanceStraightLabel.innerHTML = '';
      elevationChangeLabel.innerHTML = '';
    };

    // ANALYSIS RESULT FEATURE //
    //  - SET SOURCE POLYLINE //
    this.addEventListener('trace-result-complete', ({detail: {traceResult}}) => {
      _traceResultFeature = traceResult;
      if (_traceResultFeature) {
        const {distanceTraveledMiles, startEndMiles, startZ, endZ} = this.followAlong.setSourcePolyline(_traceResultFeature.geometry.clone());
        distanceTraveledLabel.innerHTML = distanceFormatter.format(distanceTraveledMiles);
        distanceStraightLabel.innerHTML = distanceFormatter.format(startEndMiles);
        elevationChangeLabel.innerHTML = distanceFormatter.format((endZ - startZ) * metersToFeet);
        this.clearCharts();
      }
    });

    // RESET  //
    this.addEventListener('trace-result-reset', ({detail: {}}) => {
      this.clearCharts();
      this.followAlong.reset();
    });

    // PLAY //
    this.addEventListener('trace-result-play', ({detail: {active}}) => {
      this.followAlong.play({active});
    });

    // LOOP //
    this.addEventListener('trace-result-loop', ({detail: {loop}}) => {
      this.followAlong.loop = loop;
    });

    // CLEAR //
    this.addEventListener('trace-result-clear', ({detail: {}}) => {
      this.clearDistanceLabels();
      this.clearCharts();
      this.followAlong.clear();
      this.dispatchEvent(new CustomEvent("source-change", {detail: {}}));
    });

  }

  /**
   *
   * @param view
   */
  initializeTotalsCharts({view}) {

    // TOTALS FORMATTER //
    const totalsFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    // TOTALS //
    let totals = {count: 0, population: 0, businesses: 0, farms: 0};

    // SOURCE DATA //
    let sourceData = [];
    // DATA ATTRIBUTE NAME FOR EACH CHART //
    const attributeNameByChartId = ['TOTPOP_CY', 'S01_BUS', 'S02_BUS'];
    const attributeLabelByChartId = ['persons', 'businesses', 'farms'];

    //console.dir(Chart.defaults);
    Chart.defaults.font.family = "'Avenir Next', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
    Chart.defaults.color = "#efefef";
    Chart.defaults.scale.grid.color = '#0d2f40';
    Chart.defaults.scale.grid.lineWidth = 1.5;

    /**
     * GET DEFAULT CHART CONFIG
     *
     * @param {string} title
     * @returns {{}}
     */
    const getDefaultChartConfig = (title) => {
      return {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            pointRadius: 3,
            pointBorderColor: '#F7BD77',
            pointBackgroundColor: '#f9a845',
            borderColor: '#efefef',
            borderWidth: 1.5,
            data: []
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animations: false,
          layout: {padding: 8},
          scales: {
            y: {
              //suggestedMin: 0,
              suggestedMax: 10
            },
            x: {display: false}
          },
          plugins: {
            legend: {display: false},
            title: {
              display: true,
              text: title || '',
              color: '#efefef',
              font: {size: 13}
            },
            tooltip: {
              padding: 10,
              boxPadding: 8,
              bodySpacing: 6,
              titleFont: {size: 14},
              bodyFont: {size: 13},
              backgroundColor: 'rgba(1,25,38,0.8)',
              borderColor: '#dedede',
              borderWidth: 1.5,
              callbacks: {
                title: function (tooltipItems) {
                  return sourceData[tooltipItems[0].dataIndex].NAME;
                },
                label: function (tooltipItem) {
                  const sourceDataItem = sourceData[tooltipItem.dataIndex];
                  const dataValue = sourceDataItem[attributeNameByChartId[tooltipItem.chart.id]];
                  const dataLabel = attributeLabelByChartId[tooltipItem.chart.id];
                  return `${ totalsFormatter.format(dataValue) } ${ dataLabel } ${ sourceDataItem.previouslyCounted ? ' *' : '' }`;
                }
              }
            }
          }
        }
      };
    };

    //
    // CREATE CHARTS AND SET TITLE //
    //

    // TOTAL POPULATION CHART //
    const totalPopulationChartNode = document.getElementById('total-population-chart');
    const totalPopulationChart = new Chart(totalPopulationChartNode, getDefaultChartConfig('Population'));
    totalPopulationChart.update();

    // NUMBER OF BUSINESSES CHART //
    const totalBusinessesChartNode = document.getElementById('total-businesses-chart');
    const totalBusinessesChart = new Chart(totalBusinessesChartNode, getDefaultChartConfig('Number of Businesses'));
    totalBusinessesChart.update();

    // NUMBER OF FARMS CHART //
    const totalFarmsChartNode = document.getElementById('total-farms-chart');
    const totalFarmsChart = new Chart(totalFarmsChartNode, getDefaultChartConfig('Number of Farms'));
    totalFarmsChart.update();

    /**
     *
     */
    this.clearCharts = () => {

      sourceData = [];
      totals = {count: 0, population: 0, businesses: 0, farms: 0};

      // UPDATE POPULATION CHART //
      totalPopulationChart.data.labels = [];
      totalPopulationChart.data.datasets[0].data = [];
      totalPopulationChart.options.plugins.title.text = `Population`;
      totalPopulationChart.update();

      // UPDATE BUSINESSES CHART //
      totalBusinessesChart.data.labels = [];
      totalBusinessesChart.data.datasets[0].data = [];
      totalBusinessesChart.options.plugins.title.text = `Number of Businesses`;
      totalBusinessesChart.update();

      // UPDATE FARMS CHART //
      totalFarmsChart.data.labels = [];
      totalFarmsChart.data.datasets[0].data = [];
      totalFarmsChart.options.plugins.title.text = `Number of Farms`;
      totalFarmsChart.update();

    };

    /**
     *
     * @param {Object} attributes
     * @param {boolean} [attributes.previouslyCounted] previously counted
     * @param {number} [attributes.TOTPOP_CY] total population
     * @param {number} [attributes.S01_BUS] number of businesses
     * @param {number} [attributes.S02_BUS] number of farms
     */
    this.updateCharts = (attributes) => {

      // VALUES //
      sourceData.push(attributes);

      // UPDATE TOTALS //
      totals.count++;
      if (!attributes.previouslyCounted) {
        totals.population += attributes.TOTPOP_CY;
        totals.businesses += attributes.S01_BUS;
        totals.farms += attributes.S02_BUS;
      }

      const label = (totals.count > 1) ? '' : 'start';

      // UPDATE POPULATION CHART //
      totalPopulationChart.data.labels.push(label);
      totalPopulationChart.data.datasets[0].data.push(totals.population);
      totalPopulationChart.options.plugins.title.text = `${ totalsFormatter.format(totals.population) } Persons`;
      totalPopulationChart.update();

      // UPDATE BUSINESSES CHART //
      totalBusinessesChart.data.labels.push(label);
      totalBusinessesChart.data.datasets[0].data.push(totals.businesses);
      totalBusinessesChart.options.plugins.title.text = `${ totalsFormatter.format(totals.businesses) } Businesses`;
      totalBusinessesChart.update();

      // UPDATE FARMS CHART //
      totalFarmsChart.data.labels.push(label);
      totalFarmsChart.data.datasets[0].data.push(totals.farms);
      totalFarmsChart.options.plugins.title.text = `${ totalsFormatter.format(totals.farms) } Farms`;
      totalFarmsChart.update();

    };

  }

}

export default new Application();
