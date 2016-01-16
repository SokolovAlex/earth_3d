(function (angular) {
    'use strict';

    angular
        .module('application', [

            /* vendors */
            'angular-loading-bar',
            'pascalprecht.translate',
            'ui.router',
            'ui.bootstrap',
            'ngResource',

            'application.guessCountry',
        ])
        .config(config)
        .run(run);

    function config(
        $stateProvider,
        $locationProvider
        //$translateProvider
    ) {
        $locationProvider.html5Mode(true);

        $stateProvider
            .state('application', {
                url: '/',
                templateUrl: 'application/application.html'
            });

        //$translateProvider.useStaticFilesLoader({
        //    prefix: '/translates/',
        //    suffix: '.json'
        //});

        //$translateProvider.useSanitizeValueStrategy(null);
        //$translateProvider.preferredLanguage('ru-RU');

    }

    function run($rootScope, $state) {

        $rootScope.$on('$stateChangeStart',
            function (event, toState) {


                if (toState.name === 'application') {

                    event.preventDefault();

                    $state.go('application.guessCountry', {}, {location: 'replace'})

                } else if (toState.defaultTo) {

                    event.preventDefault();
                    $state.go(toState.defaultTo, {}, {location: 'replace'})
                }

            });

        //$rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        //    if (toState.classNames) {
        //        $rootScope.classNames = toState.classNames;
        //    }
        //
        //
        //    $rootScope.stateName = toState.name;
        //});
    }


})(angular);
