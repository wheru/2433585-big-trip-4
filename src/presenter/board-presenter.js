import { FilterType, SortType, UpdateType, UserAction, filters } from '../const';
import { RenderPosition, remove, render } from '../framework/render.js';
import { sortByOffers, sortByPrice, sortByTime } from '../utils/point-utils.js';
import EventEmptyListView from '../view/event-list-empty.js';
import EventListView from '../view/event-list-view';
import SortView from '../view/sort-view';
import NewPointPresenter from './new-point-presenter.js';
import PointPresenter from './point-presenter.js';


export default class BoardPresenter {
  #eventsContainer = null;
  #pointModel = null;
  #citiesModel = null;
  #offersModel = null;
  #filterModel = null;
  #sortComponent = null;
  #noPointComponent = null;

  #pointPresenters = new Map();
  #newPointPresenter = null;
  #eventsComponent = new EventListView();

  #currentSortType = SortType.DAY;
  #filterType = FilterType.EVERYTHING;


  constructor({ boardContainer, pointModel, citiesModel, offersModel, filterModel, onNewPointDestroy }) {
    this.#eventsContainer = boardContainer;
    this.#pointModel = pointModel;
    this.#citiesModel = citiesModel;
    this.#offersModel = offersModel;
    this.#filterModel = filterModel;

    this.#newPointPresenter = new NewPointPresenter({
      pointListContainer: this.#eventsComponent,
      citiesModel: this.#citiesModel,
      offersModel: this.#offersModel,
      changeDataHandler: this.#handleViewAction,
      destroyHandler: onNewPointDestroy
    });

    this.#pointModel.addObserver(this.#handleModelPoint);
    this.#filterModel.addObserver(this.#handleModelPoint);
  }

  get points() {
    this.#filterType = this.#filterModel.filter;
    const points = this.#pointModel.points;
    const filteredPoints = filters[this.#filterType](points);

    switch (this.#currentSortType) {
      case SortType.TIME:
        return filteredPoints.sort(sortByTime);
      case SortType.PRICE:
        return filteredPoints.sort(sortByPrice);
      case SortType.OFFERS:
        return filteredPoints.sort(sortByOffers);
    }

    return filteredPoints;
  }

  init() {
    this.#renderBoard();
  }

  #renderBoard() {
    if (this.points.length === 0) {
      this.#renderNoPointView();
      return;
    }

    this.#renderPoints();

    this.#renderSortView();
    this.#renderPointList();
  }

  createPoint() {
    this.#currentSortType = SortType.DAY;
    this.#filterModel.setFilter(UpdateType.MAJOR, FilterType.EVERYTHING);
    this.#newPointPresenter.init();
  }

  #clearTrip({ resetSortType = false } = {}) {
    this.#newPointPresenter.destroy();
    this.#pointPresenters.forEach((presenter) => presenter.destroy());
    this.#pointPresenters.clear();

    remove(this.#sortComponent);

    if (this.#noPointComponent) {
      remove(this.#noPointComponent);
    }

    if (resetSortType) {
      this.#currentSortType = SortType.DAY;
    }
  }

  #handleSortTypeChange = (sortType) => {
    if (this.#currentSortType === sortType) {
      return;
    }

    this.#currentSortType = sortType;

    this.#clearTrip({ resetRenderedTaskCount: true });
    this.#renderBoard();
  };

  #renderSortView() {
    if (this.#sortComponent !== null) {
      remove(this.#sortComponent);
    }

    this.#sortComponent = new SortView({
      onSortTypeChange: this.#handleSortTypeChange,
      currentSortType: this.#currentSortType
    });

    render(this.#sortComponent, this.#eventsComponent.element, RenderPosition.AFTERBEGIN);
  }

  #renderPointList() {
    render(this.#eventsComponent, this.#eventsContainer);
  }

  #renderPoint(point) {
    const pointPresenter = new PointPresenter({
      pointContainer: this.#eventsComponent.element,
      citiesModel: this.#citiesModel,
      offersModel: this.#offersModel,
      onDataChange: this.#handleViewAction,
      onModeChange: this.#handleModeChange,
    });

    pointPresenter.init(point);
    this.#pointPresenters.set(point.id, pointPresenter);
  }

  #renderPoints() {
    this.points.forEach((point) => this.#renderPoint(point));
  }

  #renderNoPointView() {
    this.#noPointComponent = new EventEmptyListView({
      filterType: this.#filterType
    });

    render(this.#noPointComponent, this.#eventsContainer, RenderPosition.AFTERBEGIN);
  }

  #handleModeChange = () => {
    this.#newPointPresenter.destroy();
    this.#pointPresenters.forEach((presenter) => presenter.resetView());
  };

  #handleViewAction = (actionType, updateType, update) => {
    switch (actionType) {
      case UserAction.UPDATE_POINT:
        this.#pointModel.updatePoint(updateType, update);
        break;
      case UserAction.ADD_POINT:
        this.#pointModel.addPoint(updateType, update);
        break;
      case UserAction.DELETE_POINT:
        this.#pointModel.deletePoint(updateType, update);
        break;
    }
  };

  #handleModelPoint = (updateType, data) => {
    switch (updateType) {
      case UpdateType.PATCH:
        this.#pointPresenters.get(data.id).init(data);
        break;
      case UpdateType.MINOR:
        this.#clearTrip();
        this.#renderBoard();
        break;
      case UpdateType.MAJOR:
        this.#clearTrip({ resetSortType: true });
        this.#renderBoard();
        break;
    }
  };
}
