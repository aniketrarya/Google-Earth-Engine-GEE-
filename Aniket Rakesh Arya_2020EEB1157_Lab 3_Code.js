Map.setCenter = (76.77,30.73, 11);
var CROP = gfsad.select('landcover').eq(1);
var AREA = gaul.filter(ee.Filter.eq('ADM1_NAME', 'Washington'));
var POINTS = CROP.selfMask().stratifiedSample({numPoints:1, region:AREA, geometries: true}
);
POINTS = POINTS.map(function(feature) {
  return ee.Feature(feature.geometry(), {'id': feature.id()})
});
var outline = ee.Image().byte().paint({
featureCollection: AREA,
color: 1,
width: 2
});

var START_DATE = '2016-01-01';
var END_DATE = '2016-12-31';
var modisBands =['sur_refl_b03','sur_refl_b04','sur_refl_b01','sur_refl_b02','sur_refl_b06','sur_refl_b07'];
var lsBands = ['blue','green','red','nir','swir1','swir2'];

function getQABits(image, start, end, newName) {
  var pattern = 0;
  for (var i = start; i<= end; i++) {
    pattern += Math.pow(2, i);
  }
  return image.select([0], [newName]).bitwiseAnd(pattern).rightShift(start);
}

function maskQuality(image) {
  var QA = image.select('StateQA');
  var internalQuality = getQABits(QA,8, 13, 'internal_quality_flag');
  return image.updateMask(internalQuality.eq(0));
}

var noCloud = modis.filterDate(START_DATE,END_DATE)
.map(maskQuality)
.select(modisBands,lsBands)
.filter(ee.Filter.bounds(POINTS))

function addNDVI(noCloud) {
  var ndvi = noCloud.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).rename('ndvi')
  return noCloud.addBands([ndvi])
}
function addNDWI(noCloud) {
  var ndwi = noCloud.normalizedDifference(['sur_refl_b04', 'sur_refl_b02']).rename('ndwi')
  return noCloud.addBands([ndwi])
}
function addNDSI(noCloud) {
  var ndsi = noCloud.normalizedDifference(['sur_refl_b04', 'sur_refl_b06']).rename('ndsi')
  return noCloud.addBands([ndsi])
}
function addNDGI(noCloud) {
  var ndgi = noCloud.normalizedDifference(['sur_refl_b04', 'sur_refl_b01']).rename('ndgi')
  return noCloud.addBands([ndgi])
}
function addNDBI(noCloud) {
  var ndbi = noCloud.normalizedDifference(['sur_refl_b02', 'sur_refl_b07']).rename('ndbi')
  return noCloud.addBands([ndbi])
}
function addNBR(noCloud) {
  var nbr = noCloud.normalizedDifference(['sur_refl_b07', 'sur_refl_b02']).rename('nbr')
  return noCloud.addBands([nbr])
}
function addCMR(noCloud) {
  // var cmr = noCloud.normalizedDifference(['sur_refl_b06', 1]).rename('cmr')
  var cmr = noCloud.select('sur_refl_b06').divide(noCloud.select('sur_refl_b07')).rename('cmr')
  return noCloud.addBands([cmr])
}

function addFMR(noCloud) {
  var fmr = noCloud.select('sur_refl_b06').divide(noCloud.select('sur_refl_b02')).rename('fmr')
  return noCloud.addBands([fmr])
}

function addIOR(noCloud) {
  var ior = noCloud.select('sur_refl_b01').divide(noCloud.select('sur_refl_b03')).rename('ior')
  return noCloud.addBands([ior])
}

var collectionNDVI = modis.filterDate(START_DATE, END_DATE)
.map(addNDVI);

var collectionNDWI = modis.filterDate(START_DATE, END_DATE)
.map(addNDWI);

var collectionNDBI  = modis.filterDate(START_DATE, END_DATE)
.map(addNDBI);

var collectionNBR  = modis.filterDate(START_DATE, END_DATE)
.map(addNBR);

var collectionNDGI = modis.filterDate(START_DATE, END_DATE)
.map(addNDGI);

var collectionNDSI = modis.filterDate(START_DATE, END_DATE)
.map(addNDSI);

var collectionCMR  = modis.filterDate(START_DATE, END_DATE)
.map(addCMR);

var collectionFMR  = modis.filterDate(START_DATE, END_DATE)
.map(addFMR);

var collectionIOR  = modis.filterDate(START_DATE, END_DATE)
.map(addIOR);

Map.addLayer(noCloud.median(),visParams,'MODIS Composite');
Map.addLayer(outline, {palette: ['black']}, 'Regional Boundary');
Map.addLayer(POINTS, {color: 'green'}, 'Farm Locations');
Map.addLayer(collectionNDVI.median(), {bands: ['ndvi'], min: -1, max: 1,palette:['lightyellow','yellow','green']}, 'NDVI');
Map.addLayer(collectionNDWI.median(), {bands: ['ndwi'], min: -1, max: 1,palette:['cyan','blue','darkblue']}, 'NDWI');
Map.addLayer(collectionNDSI.median(), {bands: ['ndsi'], min: -1, max: 1,palette:['black','white']}, 'NDSI');
Map.addLayer(collectionNDGI.median(), {bands: ['ndgi'], min: -1, max: 1,palette:['black','white']}, 'NDGI');
Map.addLayer(collectionNDBI.median(), {bands: ['ndbi'], min: -1, max: 1,palette:['white','black']}, 'NDBI');
Map.addLayer(collectionNBR.median(), {bands: ['nbr'], min: -1, max: 1,palette:['red','green']}, 'NBR');
Map.addLayer(collectionCMR.median(), {bands: ['cmr'], min: -0.7, max: 0.7,palette:['green','blue']}, 'CMR');
Map.addLayer(collectionFMR.median(), {bands: ['fmr'], min: -1, max: 1,palette:['red','green']}, 'FMR');
Map.addLayer(collectionIOR.median(), {bands: ['ior'], min: -0.7, max: 0.7, palette: ['red', 'green']}, 'IOR');

var chart = ui.Chart.image.seriesByRegion({
imageCollection: collectionIOR.select('ior'),
regions: POINTS,
reducer: ee.Reducer.mean()
});
print(chart)
