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
            var material = new THREE.MeshPhongMaterial({color: settings.oceanColor, transparent: true,
                polygonOffsetFactor: -1 ,
                polygonOffset: true,
                polygonOffsetUnits: 1});
            var sphere = new THREE.SphereGeometry(settings.earthRadius, segments, segments);
            var baseGlobe = new THREE.Mesh(sphere, material);
            baseGlobe.rotation.y = Math.PI;

            baseGlobe.renderOrder = 0;

            var worldTexture = mapTexture(countries, settings.countriesColor);
            var mapMaterial = new THREE.MeshPhongMaterial({
                map: worldTexture, transparent: true,
                polygonOffsetFactor: -1 ,
                polygonOffset: true,
                polygonOffsetUnits: 1});
            var baseMap = new THREE.Mesh(new THREE.SphereGeometry(settings.earthRadius, segments, segments), mapMaterial);
            baseMap.rotation.y = Math.PI;
            baseMap.renderOrder = 1;
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

        function createClouds(segments) {
            var loader = new THREE.TextureLoader();
            var mesh = new THREE.Mesh(
                new THREE.SphereGeometry(settings.cloudsRadius, segments, segments),
                new THREE.MeshPhongMaterial({
                    map: loader.load('/assets/images/globe/images/fair_clouds_4k.png'),
                    side: THREE.DoubleSide,
                    opacity: 0.5,
                    polygonOffset: true,
                    polygonOffsetUnits: 1,
                    polygonOffsetFactor: 1,
                    transparent: true
                })
            );

            mesh.renderOrder = 2;
            return {
                mesh: mesh,
                move: function(delta) {
                    mesh.rotateY( 1/32 * delta );
                }
            };
        }

        function createOverlay(segments) {
            var material = new THREE.MeshPhongMaterial({
                transparent: true,
                opacity: 0,
                polygonOffsetFactor: 0,
                polygonOffset: true,
                polygonOffsetUnits: 1,
                color: '#fff'
            });
            var sphere = new THREE.SphereGeometry(202, segments, segments);
            var _overlay = new THREE.Mesh(sphere, material);
            _overlay.rotation.y = Math.PI;

            _overlay.renderOrder = 1;

            return {
                mesh: _overlay
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

                var stars = createStars(segments);

                var earth = createEarth(countries, segments),
                    baseGlobe = earth.globe,
                    baseMap = earth.map;

                overlay = createOverlay(segments).mesh;

                var clouds = createClouds(segments);

                var root = new THREE.Object3D();
                root.scale.set(2.5, 2.5, 2.5);

                root.add(baseGlobe);

                root.add(baseMap);

                root.add(clouds.mesh);

                root.add(overlay);

                root.add(stars.mesh);

                scene.add(root);

                var events  = globeEvents(countries, overlay, textureCache, geo, root, countriesCodes, camera);

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
                    //stars.move(deltaMsec / 1000);

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