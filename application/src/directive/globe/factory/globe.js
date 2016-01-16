(function(angular) {
    angular
        .module('globe.factory', [
            'common.geoHelper',
            'common.utils',
            'common.scene',
            'common.eventHelper',
            'common.mapTexture',
            'globe.events'
        ])
        .factory('globe', globeFactory);

    function globeFactory(geoHelper, sceneHelper, utils, eventHelper, mapTexture, globeEvents) {
        var controls;
        var scene, renderer, canvas, camera, geo;

        var setEvents = eventHelper.setEvents;

        var settings = window.settings.globe;

        var textureCache = utils.memorize(function (cntryID, color) {
            var country = geo.find(cntryID);
            return mapTexture(country, color);
        });

        function initControls() {
            var _controls = new THREE.TrackballControls(camera, renderer.domElement);
            _controls.rotateSpeed = 4.0;
            _controls.noZoom = false;
            _controls.noPan = true;
            _controls.staticMoving = false;
            _controls.minDistance = settings.minZoom;
            _controls.maxDistance = settings.maxZoom;
            return _controls;
        }

        function createEarth(countries, segments) {
            var material = new THREE.MeshPhongMaterial({color: settings.oceanColor, transparent: true});
            var sphere = new THREE.SphereGeometry(settings.earthRadius, segments, segments);
            var baseGlobe = new THREE.Mesh(sphere, material);
            baseGlobe.rotation.y = Math.PI;

            var worldTexture = mapTexture(countries, settings.countriesColor);
            var mapMaterial = new THREE.MeshPhongMaterial({map: worldTexture, transparent: true});
            var baseMap = new THREE.Mesh(new THREE.SphereGeometry(settings.earthRadius, segments, segments), mapMaterial);
            baseMap.rotation.y = Math.PI;

            return {
                map: baseMap,
                globe: baseGlobe
            };
        }

        function createStars(segments) {
            var mesh = new THREE.Mesh(
                new THREE.SphereGeometry(settings.starsRadius, segments, segments),
                new THREE.MeshBasicMaterial({
                    map:  THREE.ImageUtils.loadTexture('/assets/images/globe/images/galaxy_starfield.png'),
                    side: THREE.BackSide
                })
            );
            return {
                mesh: mesh,
                move: function(delta) {
                    mesh.rotateY( 1/16 * delta );
                    mesh.rotateX( 1/32 * delta );
                }
            };
        }

        function createClouds3(segments) {
            var loader = new THREE.TextureLoader();
            var mesh = new THREE.Mesh(
                new THREE.SphereGeometry(settings.cloudsRadius, segments, segments),
                new THREE.MeshPhongMaterial({
                    map: loader.load('/assets/images/globe/images/fair_clouds_4k.png'),
                    side: THREE.DoubleSide,
                    transparent: true
                })
            );
            return {
                mesh: mesh,
                move: function(delta) {
                    mesh.rotateY( 1/32 * delta );
                }
            };
        }

        function createClouds2() {
            var geometry = new THREE.SphereGeometry(settings.cloudsRadius, 32, 32);
            var loader = new THREE.TextureLoader();

            var material = new THREE.MeshPhongMaterial({
                map : loader.load('images/earthcloudmap.jpg'),
                bumpScale : 0.02,
                transparent: true,
                opacity: 0.1,
                specular : new THREE.Color('grey')
            });
            var mesh = new THREE.Mesh(geometry, material);
            return {
                mesh: mesh,
                move: function(delta) {
                    mesh.rotateY( 1/16 * delta );
                }
            };
        }

        function createClouds(segments) {
            var canvasResult = document.createElement('canvas');
            canvasResult.width = 1024;
            canvasResult.height = 512;
            var contextResult = canvasResult.getContext('2d');

            var imageMap = new Image();
            imageMap.addEventListener("load", function() {
                var canvasMap = document.createElement('canvas');
                canvasMap.width = imageMap.width;
                canvasMap.height = imageMap.height;
                var contextMap = canvasMap.getContext('2d');
                contextMap.drawImage(imageMap, 0, 0);
                var dataMap = contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height);

                var imageTrans = new Image();
                imageTrans.addEventListener("load", function(){
                    var canvasTrans = document.createElement('canvas');
                    canvasTrans.width = imageTrans.width;
                    canvasTrans.height = imageTrans.height;
                    var contextTrans = canvasTrans.getContext('2d');
                    contextTrans.drawImage(imageTrans, 0, 0);
                    var dataTrans = contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height);
                    var dataResult = contextMap.createImageData(canvasMap.width, canvasMap.height);
                    for(var y = 0, offset = 0; y < imageMap.height; y++){
                        for(var x = 0; x < imageMap.width; x++, offset += 4){
                            dataResult.data[offset+0] = dataMap.data[offset+0];
                            dataResult.data[offset+1] = dataMap.data[offset+1];
                            dataResult.data[offset+2] = dataMap.data[offset+2];
                            dataResult.data[offset+3] = 255 - dataTrans.data[offset+0];
                        }
                    }
                    contextResult.putImageData(dataResult,0,0);
                    material.map.needsUpdate = true;
                });
                imageTrans.src = '/assets/images/globe/images/earthcloudmaptrans.jpg';
            }, false);

            imageMap.src = '/assets/images/globe/images/earthcloudmap.jpg';

            var geometry = new THREE.SphereGeometry(settings.cloudsRadius, segments, segments);

            var material = new THREE.MeshPhongMaterial({
                map: new THREE.Texture(canvasResult),
                //side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });
            var mesh = new THREE.Mesh(geometry, material);
            return {
                mesh: mesh,
                move: function(delta) {
                    mesh.rotateY( 1/32 * delta );
                }
            };
        }

        function zoomIn() {
            camera.translateZ(-settings.zoomStep);
        }

        function zoomOut() {
            camera.translateZ(settings.zoomStep);
        }

        function init(container, width, height) {
            var overlay;

            function onLoadWorld(err, data) {
                if (err) return;

                var segments = 155;

                var countriesCodes = {};
                _.each(data.objects.countries.geometries, function(country) {
                    countriesCodes[country.id] = country.code;
                });

                var countries = topojson.feature(data, data.objects.countries);
                geo = geoHelper.geodecoder(countries.features);

                var sceneObj = sceneHelper.init(container, width, height);
                scene = sceneObj.scene;
                renderer = sceneObj.renderer;
                canvas = sceneObj.canvas[0][0];
                camera = sceneObj.camera;

                eventHelper.setOffset(sceneObj.offsetX, sceneObj.offsetY);

                geoHelper.setSize(width, height);

                eventHelper.setSize(width, height);

                controls = initControls();

                var earth = createEarth(countries, segments),
                    baseGlobe = earth.globe,
                    baseMap = earth.map;

                var clouds = createClouds3(segments);
                var stars = createStars(segments);

                var root = new THREE.Object3D();
                root.scale.set(2.5, 2.5, 2.5);
                root.add(baseGlobe);
                root.add(baseMap);

                root.add(clouds.mesh);
                root.add(stars.mesh);

                scene.add(root);

                var events  = globeEvents(countries, overlay, textureCache, geo, root, countriesCodes);

                canvas.addEventListener('mousedown', events.onMouseDown, false);

                canvas.addEventListener('mousemove', events.onMouseMove, false);

                canvas.addEventListener('dragover', events.onDragOver, false);

                canvas.addEventListener('dragenter', events.onDragEnter, false);

                canvas.addEventListener('dragleave', events.onDragLeave, false);

                canvas.addEventListener('drop', events.onDrop, false);

                baseGlobe.addEventListener('click', events.onGlobeClick);

                baseGlobe.addEventListener('dragover', events.onGlobeMouseMove);

                setEvents(camera, [baseGlobe], 'click');
                setEvents(camera, [baseGlobe], 'mousemove', 10);
                setEvents(camera, [baseGlobe], 'dragover', 10);

                var lastTimeMsec = null;
                requestAnimationFrame(function animate(nowMsec) {
                    requestAnimationFrame(animate);

                    lastTimeMsec = lastTimeMsec || nowMsec - 1000 / 60;
                    var deltaMsec = Math.min(200, nowMsec - lastTimeMsec);
                    lastTimeMsec = nowMsec;

                    clouds.move(deltaMsec / 1000);
                    stars.move(deltaMsec / 1000);

                    controls.update();
                    renderer.render(scene, camera);
                });
            }

            d3.json('data/globe/data/world.json', onLoadWorld);
        }

        return {
            init: init,
            zoomIn: zoomIn,
            zoomOut: zoomOut
        };
    }
})(angular);