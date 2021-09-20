'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

///////////////////////////////////////////////
class Workout {
  // Instance Properties/Fields
  date = new Date();
  // unique identifier for each Instance
  id = (Date.now() + '').slice(-10);

  constructor(distance, duration, coords) {
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.coords = coords; // array of [latitude, longitude]
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    }, ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  // property/field available on all instances
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
    // this.type = 'running';
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  // Private Instance properties
  #map;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 13;

  constructor() {
    // * GET USER'S POSITION
    // The 'constructor()' method IMMEDIATLY gets called when a new Object is created from this Class.
    this._getPosition();

    // * GET DATA FROM LOCAL STORAGE
    this._getLocalStorage();

    // * ATTACH EVENT HANDLERS
    // Creates a Map Marker when form is submitted
    // ⭐ need to set the 'this' keyword to be set to that Instance Object created from this Class in the eventListeners functions using 'bind(this). Otherwise the 'this' keyword will be set to the Object onto  which the eventListener is attached, which will give us an error. [common thing to do when using 'eventListeners' in a class.]
    form.addEventListener('submit', this._newWorkout.bind(this));

    // displays 'Elev Gain' Input 'Cycling' option is chosen
    // Call-Back doesn't use the 'this' keyword so we dont need to bind it instances of this Class ('bind(this)')
    inputType.addEventListener('change', this._toggleElevationField);

    // moves view to clicked workout popup
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
  }

  _getPosition() {
    // Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          console.log(`Cannot get Current Position 🍁`);
        }
      );
    }
  }

  _loadMap(position) {
    console.log(position);

    // Object Destructuring
    const { latitude, longitude } = position.coords;

    // (takes me to my current location on google maps)
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // Leaflet Map Library 👇
    this.#map = L.map('map').setView(coords, this.#zoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords)
    //   .addTo(this.#map)
    //   .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
    //   .openPopup();

    // handles click on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // eventHandler function
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    // Helper function - check if inputs are of type Number
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    // Helper function  - returns true if all inputs are greater than 0.
    const positiveInputs = (...inputs) => inputs.every(input => input > 0);

    event.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is Running --> create running Object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveInputs(distance, duration, cadence)
      ) {
        return alert('Inputs have to be Positive Numbers! 😡');
      }

      // Create new Running Instance/Object
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is Cycling --> create cycling Object
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !positiveInputs(distance, duration)
      ) {
        return alert('Inputs have to be Positive Numbers! 😡');
      }

      // Create new Cycling Instance/Object
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new Object to the workout Array
    this.#workouts.push(workout);
    console.log(workout);

    // Render workout on map as Marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
      `;

    if (workout.type === 'running') {
      html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>
         `;
    }

    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>
           `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToWorkout(event) {
    const workoutElement = event.target.closest('.workout');

    if (!workoutElement) return;

    const workout = this.#workouts.find(
      work => work.id === workoutElement.dataset.id
    );

    // moves map to clicked workout element's coords
    this.#map.setView(workout.coords, this.#zoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  // stored data in local Storage API
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // gets data stored in local storage API
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // deletes data stored in local storage
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

console.log(
  `⛔ Type 'app.reset()' in the Console to reset all saved workout data.`
);

// A Fully Responsive Workout Tracker Web Application that uses multiple APIs in order to track and locally save the User's workouts Input Data. APIs used in this APP includes a Geolocation API which pinpoints the user's workout location, and a Local Storage API which saves the user's workout input data to the browser's Local Storage. This Web Applications was created using HTML5, CSS3, and JavaScript.
