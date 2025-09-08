'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// HD MY CHANGES
const resetEle = document.querySelector('.reset');
const sortSelectEle = document.querySelector('.sort_select');
const sortBtn = document.querySelector('.sort_btn');
const showAllBtn = document.querySelector('.show__all_btn');

// concept-GEOLOCATION API

// concept REFACTORING FOR PROJECT ARCHITECTURE USING CLASSES-

class Workout {
  markerType = 'marker';
  radius;
  clicks = 0;
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1); //min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km/hr
    return this.speed;
  }
}

////////////////////////////////////////
// APPLICATION ARCHITECTURE

class App {
  #workouts = [];
  #marker = [];
  #mapEvent;

  #map;
  #drawing = false;
  #drawingType = 'marker';

  #mapZoomLevel = 13;
  #sortAscend = true;
  edit = false;
  editWorkoutObj = null;

  constructor() {
    // get user position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // attach event handlers

    // SUBMIT
    form.addEventListener('submit', this._newWorkout.bind(this));

    // TOGGLE RUNNING/CYCLING
    inputType.addEventListener('change', this._toggleElevationField);

    // CONTAINER CLICKS(EDIT/DEL/MOVE)
    containerWorkouts.addEventListener(
      'click',
      this._containerClicks.bind(this)
    );

    // RESET
    resetEle.addEventListener('click', this.reset);

    // SORT-FIELD
    sortSelectEle.addEventListener('change', () => {
      this.#sortAscend = true; //inside arrow function 'this' will take value of parent scope which is 'app'
      // in regular func, 'this' will get value of targetEle
      console.log(this);
    });

    // SORT
    sortBtn.addEventListener('click', this._sortList.bind(this));

    // SHOW ALL WORKOUTS ON MAP
    showAllBtn.addEventListener('click', this._showAllWorkouts.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert(`Couldn't get your Position`);
      }
    );
  }

  _loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    console.log(latitude, longitude);
    console.log(pos.coords.accuracy);

    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(this.#map);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    console.log(this.#map);

    // this._getLocalStorage(); //put here
    // alt-put only this functionality here, and call it in beginning in ctor

    this.#workouts.forEach(workout => {
      this._renderWorkoutMarkerOptions(workout);
    });

    const showFormBind = this._showForm.bind(this);
    this.#map.on('click', showFormBind);

    this.#map.on('draw:drawstart', e => {
      this.#drawing = true;
      // console.log(e);
      this.#map.off('click', showFormBind);
    });

    this.#map.on('draw:drawstop', e => {
      // console.log(e);
      this.#map.on('click', showFormBind);
    });

    // Add draw control to the map
    const drawControl = new L.Control.Draw({
      draw: {
        polyline: true, // Allow drawing lines
        polygon: true, // Allow drawing polygons
        marker: false, // Allow drawing markers
        circle: true, // Disable circles
        rectangle: true, // Disable rectangles
        circlemarker: false,
      },
    });
    this.#map.addControl(drawControl);

    // Listen for when a shape is created
    this.#map.on('draw:created', e => {
      this.#drawingType = e.layerType;
      this._showForm(e);
    });
  }

  _showForm(mapE) {
    console.log();
    this.#mapEvent = mapE;
    console.log(this.#mapEvent);
    // form.style.transition = 'all 0.5s, transform 1ms';
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty the i/p
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    inputType.value = 'running';

    // form.style.transition = '';//alt

    if (this.edit) {
      containerWorkouts.insertAdjacentElement('afterbegin', form);
    }
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    console.log(this.value);
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // return true only when the callbk func returns true for every val in inputs.

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    // let lat, lng;
    let latlng = [];
    if (this.edit) {
      latlng = this.editWorkoutObj.coords;
    } else {
      if (this.#drawing) {
        if (this.#drawingType === 'circle') {
          // console.log(this.#mapEvent.layer._latlng);
          latlng = this.#mapEvent.layer._latlng;
        } else {
          // console.log(this.#mapEvent.layer._latlngs[0]);
          latlng = this.#mapEvent.layer._latlngs;
          // console.log(lat, lng);
          // console.log(this.#mapEvent);
        }
      } else {
        latlng = this.#mapEvent.latlng;
      }
    }

    let workout;

    // if workout running, create running obj
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check if data is valid

      // guard clause
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Input hv to be positive finite.');
      }

      workout = new Cycling(latlng, distance, duration, elevation);

      this._toggleElevationField();
    }

    // if workout cycling, create cycling obj
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Input hv to be positive finite.');
      }

      workout = new Running(latlng, distance, duration, cadence);
    }

    if (this.edit) {
      workout.markerType = this.editWorkoutObj.markerType;
      workout.radius = this.editWorkoutObj.radius;
    }

    if (this.#drawing) {
      //means not editing
      workout.markerType = this.#drawingType;
      if (this.#drawingType === 'circle') {
        workout.radius = this.#mapEvent.layer._mRadius;
      }
    }

    // add new obj to workouts array
    this.#workouts.push(workout);
    console.log(workout.markerType);

    // render workout on map as marker
    this._renderWorkoutMarkerOptions(workout);

    // Render workout on list
    this._renderWorkout(workout);
    console.log(this.#workouts);

    if (this.#drawing) {
      this.#drawing = false;
      this.#drawingType = 'marker';
    }

    // hide form + clear i/p fields
    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();

    this.edit = false;
    this.editWorkoutObj = null;
  }

  _renderWorkoutMarkerOptions(workout) {
    if (workout.markerType === 'marker') this._renderWorkoutMarker(workout);
    if (workout.markerType === 'polyline') this._renderWorkoutPolyline(workout);
    if (workout.markerType === 'polygon') this._renderWorkoutPolygon(workout);
    if (workout.markerType === 'circle') this._renderWorkoutCircle(workout);
    if (workout.markerType === 'rectangle')
      this._renderWorkoutRectangle(workout);
  }

  _renderWorkoutMarker(workout) {
    console.log(this);
    console.log(this.#mapEvent);
    let mark = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    mark.options.id = workout.id;

    this.#marker.push(mark);
  }

  _renderWorkoutPolyline(workout) {
    console.log(this);
    console.log(this.#mapEvent);
    let mark = L.polyline(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    mark.options.id = workout.id;

    this.#marker.push(mark);
  }

  _renderWorkoutPolygon(workout) {
    console.log(this);
    console.log(this.#mapEvent);
    console.log(workout.coords);
    let mark = L.polygon(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    mark.options.id = workout.id;

    this.#marker.push(mark);
  }

  _renderWorkoutCircle(workout) {
    console.log(this);
    console.log(this.#mapEvent);
    console.log(workout.coords);
    console.log(workout.radius);
    let mark = L.circle(workout.coords, { radius: workout.radius })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )

      .openPopup();

    mark.options.id = workout.id;

    this.#marker.push(mark);
  }

  _renderWorkoutRectangle(workout) {
    console.log(this);
    console.log(this.#mapEvent);
    console.log(workout.coords);
    let mark = L.polygon(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    mark.options.id = workout.id;

    this.#marker.push(mark);
  }

  _renderWorkout(workout) {
    console.log(workout);
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <div class="top_heading_tile">
            <div>
              <h2 class="workout__title">${workout.description}</h2>
            </div>
            <div>
              <span class="workout__edit workout__buttons">🖊</span>
              <span class="workout__delete workout__buttons">🗑</span>
            </div>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += ` 
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
       </li>`;
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
      </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _removeMarker(ele) {
    // remove from map
    const markPopup = this.#marker.find(
      mark => mark.options.id === ele.dataset.id
    );
    this.#map.removeLayer(markPopup);

    // remove from marker array
    const markPopupIndex = this.#marker.indexOf(markPopup);
    this.#marker.splice(markPopupIndex, 1);
  }

  _removeWorkoutFromList(ele) {
    // remove from workouts array
    const delInd = this.#workouts.findIndex(obj => obj.id === ele.dataset.id);
    this.#workouts.splice(delInd, 1);

    //remove from ui list
    ele.remove();
  }

  _editWorkout(e) {
    let ele = e.target.closest('li.workout');
    // console.log('hello');
    this.edit = true;

    this.editWorkoutObj = this.#workouts.find(obj => obj.id === ele.dataset.id);

    console.log(this.editWorkoutObj);
    ele.insertAdjacentElement('afterend', form);

    // remove marker from map + workout from list
    this._removeMarker(ele);
    this._removeWorkoutFromList(ele);

    // form.classList.remove('hidden');
    this._showForm();

    // display def values in form
    inputType.value = this.editWorkoutObj.type;
    inputDistance.value = this.editWorkoutObj.distance;
    inputDuration.value = this.editWorkoutObj.duration;
    if (this.editWorkoutObj.type === 'running')
      inputCadence.value = this.editWorkoutObj.cadence;
    if (this.editWorkoutObj.type === 'cycling') {
      this._toggleElevationField();
      inputElevation.value = this.editWorkoutObj.elevationGain;
    }
  }

  _deleteWorkout(e) {
    const ele = e.target.closest('li.workout');

    this._removeMarker(ele);
    this._removeWorkoutFromList(ele);

    this._setLocalStorage();
  }

  _moveToPopUp(e) {
    let ele = e.target.closest('li.workout');
    if (ele != null) {
      // console.log(e, e.target);

      const dataId = ele.dataset.id;
      const workout = this.#workouts.find(work => work.id === dataId);

      // Open popup, if closed
      const markPopup = this.#marker.find(mark => mark.options.id === dataId);
      if (!markPopup.isPopupOpen()) {
        markPopup.openPopup();
      }

      // move to popup
      let centerPoint = workout.coords;
      if (workout.markerType != 'marker') {
        centerPoint = markPopup.getBounds().getCenter();
      }
      this.#map.setView(centerPoint, this.#mapZoomLevel, {
        animate: true,
        pan: { duration: 1 },
      });
    }
  }

  _containerClicks(e) {
    // EDITING
    if (e.target.classList.contains('workout__edit') && !this.edit) {
      this._editWorkout(e);
    }

    // DELETING
    else if (e.target.classList.contains('workout__delete') && !this.edit) {
      this._deleteWorkout(e);
    }

    // MOVING TO POPUP
    else {
      this._moveToPopUp(e);
    }
  }
  ////////////concept-local storage api

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data1 = JSON.parse(localStorage.getItem('workouts'));
    console.log(data1);
    if (!data1) return;

    this.#workouts = data1;

    // solving problem with click() method

    this.#workouts = this.#workouts.map(work => {
      if (work.type === 'running') {
        const obj = Object.assign(new Running(), work);
        obj.date = new Date(work.date);
        return obj;
      }
      if (work.type === 'cycling') {
        const obj = Object.assign(new Cycling(), work);
        obj.date = new Date(work.date);
        return obj;
      }
    });

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
      // this._renderWorkoutMarker(workout);-will get error as map is not loaded yet
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload(); //programatically reloads the current page like refresh
  }

  _sortList() {
    let mul = 1;
    console.log(sortSelectEle.value);
    console.log(this.#workouts);

    if (!this.#sortAscend) {
      mul = -1;
      this.#sortAscend = true;
    } else {
      this.#sortAscend = false;
    }
    if (sortSelectEle.value === 'distance') {
      this.#workouts.sort((a, b) => mul * (b.distance - a.distance));
    }
    if (sortSelectEle.value === 'duration') {
      this.#workouts.sort((a, b) => mul * (b.duration - a.duration));
    }
    if (sortSelectEle.value === 'date') {
      this.#workouts.sort(
        (a, b) => mul * (b.date.getTime() - a.date.getTime())
      );
    }

    this._renderSortedList();
  }

  _renderSortedList() {
    containerWorkouts.innerHTML = '';
    containerWorkouts.insertAdjacentElement('afterbegin', form);
    this.#workouts.forEach(ele => this._renderWorkout(ele));
  }

  _showAllWorkouts(e) {
    e.preventDefault();
    let featureGroup = L.featureGroup(this.#marker);
    console.log(featureGroup);
    this.#map.fitBounds(featureGroup.getBounds());
    console.log(featureGroup.getBounds());
  }
}

const app = new App();
console.log(app);

// HD problem with local storage
// when we get bak data from the local storage, the objects we get are simple regular object and there entire prototype chain is gone and so they will not be able to inherit methods from the parent (so workout.click() will get an error)
// at time of conversion from obj to string and vice versa we lost the prototype chain
