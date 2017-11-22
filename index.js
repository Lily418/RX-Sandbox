var refreshButton = document.querySelector('.refresh');

const closeButtonCount = 3

const closeButtons = new Array(closeButtonCount)
                        .fill(undefined)
                        .map((e, index) => document.querySelector(`.close${index + 1}`))

const closeButtonClickStreams = closeButtons.map((closeButton) =>  Rx.Observable.fromEvent(closeButton, 'click'))
const refreshClickStream = Rx.Observable.fromEvent(refreshButton, 'click');


var requestStream = refreshClickStream.startWith('startup click')
    .map(function() {
        var randomOffset = Math.floor(Math.random()*500);
        return 'https://api.github.com/users?since=' + randomOffset;
    });

var responseStream = requestStream
    .flatMap(function (requestUrl) {
        return Rx.Observable.fromPromise($.getJSON(requestUrl));
    }).publish()

function createSuggestionStream(closeClickStream) {
    return closeClickStream.startWith('startup click')
        .combineLatest(responseStream,             
            function(click, listUsers) {
                return listUsers[Math.floor(Math.random()*listUsers.length)];
            }
        )
        .merge(
            refreshClickStream.map(function(){ 
                return null;
            })
        )
        .startWith(null);
}


const suggestionStreams = closeButtonClickStreams.map((closeButtonClickStream) => createSuggestionStream(closeButtonClickStream))

responseStream.connect();

// Rendering ---------------------------------------------------
function renderSuggestion(suggestedUser, selector) {
  const suggestionEl = document.querySelector(selector);
  suggestionEl.style.visibility = 'visible';
  var usernameEl = suggestionEl.querySelector('.username');
  usernameEl.href = suggestedUser.html_url;
  usernameEl.textContent = suggestedUser.login;
  var imgEl = suggestionEl.querySelector('img');
  imgEl.src = "";
  imgEl.src = suggestedUser.avatar_url;
}

function hideSuggestion(suggestedUser, selector) {
  const suggestionEl = document.querySelector(selector);
  suggestionEl.style.visibility = 'hidden';
}



suggestionStreams.forEach((suggestionStream, index) => {
  suggestionStream.filter(suggestedUser => suggestedUser !== null).subscribe((suggestedUser) => {
    renderSuggestion(suggestedUser, `.suggestion${index + 1}`);
  })

  suggestionStream.filter(suggestedUser => suggestedUser === null).subscribe((suggestedUser) => {
    hideSuggestion(suggestedUser, `.suggestion${index + 1}`);
  })
})
