/**
 *
 * Created by Pavel Akulov on 11.01.2016.
 * Email: akulov@magora-systems.ru
 * Company: Magora Systems LLC
 * Website: http://magora-systems.com
 */

(function (angular) {
    'use strict';

    angular
        .module('application.guessCountry', [
            'application.guessCountry.game',
            'directive.social',
            'directive.gameTask',
            'directive.gameProgress'
        ])
        .config(config);

    function config($stateProvider) {

        $stateProvider
            .state('application.guessCountry', {
                url: 'guess-country',
                templateUrl: 'application/guessCountry/guessCountry.html',
                controller: GuessCountryCtrl,
                controllerAs: 'guessCountryCtrl'
            });
    }

    function GuessCountryCtrl($scope, $http){
        var guessCountryCtrl = this;
        guessCountryCtrl.questions = [];
        var currentQuestionIndex = 0;

        var currentQuestion;

        $scope.$on('answer', function(event, data) {
            var error = true;
            if (data.flagCode && data.mapCode && data.flagCode == data.mapCode) {
                error = false;
                alert("Ok");
            } else {
                alert("Error");
            }
            currentQuestionIndex++;
            currentQuestion = guessCountryCtrl.questions[currentQuestionIndex];

            $scope.$broadcast('change', {
                title: currentQuestion.title,
                error: error
            });

            $scope.$apply();
        });

        $http.get('data/gameTask/data/questions.mock.json')
            .then(function(response) {
                if (!response.data) {
                    return;
                }

                guessCountryCtrl.questions = response.data.questions;
                currentQuestion = guessCountryCtrl.questions[currentQuestionIndex];

                $scope.$broadcast('initQuestions', {
                    questionAmount: guessCountryCtrl.questions.length
                });

                $scope.$broadcast('change', {
                    title: currentQuestion.title
                });
        });
    }

})(angular);