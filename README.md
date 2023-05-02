# Waterdrop’s Journey

Follow the waterdrop’s downstream journey:
* Show key demographics for the watershed the current river segment is in.
* Show the sum total of key demographics since the water drop’s journey began.
* How many people, farms, and businesses did it pass within its path?

#### ArcGIS Living Atlas
* [National Hydrography Dataset Plus High Resolution](https://www.arcgis.com/home/item.html?id=f1f45a3ba37a4f03a5f48d7454e4b654)
* [HUC10 Layers](https://livingatlas.arcgis.com/en/browse/?q=HUC10#d=3&q=HUC10)

#### Analysis Service
* Learn more about the ArcGIS Online ready-to-use [Trace Downstream](https://developers.arcgis.com/rest/elevation/api-reference/trace-downstream.htm) hydrology analysis service.
* NOTE: this analysis requires an active ArcGIS Online user account, but does NOT consumes credits.

### Technologies Used

 - [ArcGIS API for Javascript](https://developers.arcgis.com/javascript/latest/api-reference/)
 - [Calcite Components](https://developers.arcgis.com/calcite-design-system/components/)


### Deploy

This demo is built as a _static_ web application.

1. Download and copy the root folder to a web accessible location
2. Update configuration parameters in application.json

### Configure

Update the parameters in ./config/application.json file in your favorite json editor:

|      parameter | details                                                           |
|---------------:|-------------------------------------------------------------------|
|  **portalUrl** | Organization or Enterprise URL; example: https://www.arcgis.com   |
| **oauthappid** | The OAuth ID of the Web Application item                          |
|   **authMode** | For public access set to 'anonymous' (and set oauthappid to null) |
|     **apiKey** | ArcGIS Platform API key                                           |
|     **webmap** | The item id of the web map (only use webmap OR webscene)          |
|   **webscene** | The item id of the web scene (only use webmap OR webscene)        |


#### For questions about the demo web application:
> John Grayson | Prototype Specialist | Geo Experience Center\
> Esri | 380 New York St | Redlands, CA 92373 | USA\
> T 909 793 2853 x1609 | [jgrayson@esri.com](mailto:jgrayson@esri.com) | [GeoXC Demos](https://geoxc.esri.com) | [esri.com](https://www.esri.com)
