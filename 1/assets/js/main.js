
var main = (function($) { var _ = {

	/**
	 * Settings.
	 * @var {object}
	 */
	settings: {

		// Предварительная загрузка всех изображений.
			preload: false,

		// Длительность слайда (должна соответствовать «duration.slide» в _vars.scss).
			slideDuration: 500,

		// Продолжительность макета (должна соответствовать «duration.layout» в _vars.scss).
			layoutDuration: 750,

		// Миниатюры на «строку» (должны соответствовать «misc.thumbnails-per-row» в _vars.scss).
			thumbnailsPerRow: 2,

		// Сторона главной оболочки (должна соответствовать "misc.main-side" в _vars.scss).
			mainSide: 'right'

	},

	/**
	 * Window.
	 * @var {jQuery}
	 */
	$window: null,

	/**
	 * Body.
	 * @var {jQuery}
	 */
	$body: null,

	/**
	 * Main wrapper.
	 * @var {jQuery}
	 */
	$main: null,

	/**
	 * Thumbnails.
	 * @var {jQuery}
	 */
	$thumbnails: null,

	/**
	 * Viewer.
	 * @var {jQuery}
	 */
	$viewer: null,

	/**
	 * Toggle.
	 * @var {jQuery}
	 */
	$toggle: null,

	/**
	 * Nav (next).
	 * @var {jQuery}
	 */
	$navNext: null,

	/**
	 * Nav (previous).
	 * @var {jQuery}
	 */
	$navPrevious: null,

	/**
	 * Slides.
	 * @var {array}
	 */
	slides: [],

	/**
	 * Current slide index.
	 * @var {integer}
	 */
	current: null,

	/**
	 * Lock state.
	 * @var {bool}
	 */
	locked: false,

	/**
	 * Keyboard shortcuts.
	 * @var {object}
	 */
	keys: {

		// Escape: Toggle main wrapper.
			27: function() {
				_.toggle();
			},

		// Up: Move up.
			38: function() {
				_.up();
			},

		// Down: Move down.
			40: function() {
				_.down();
			},

		// Space: Next.
			32: function() {
				_.next();
			},

		// Right Arrow: Next.
			39: function() {
				_.next();
			},

		// Left Arrow: Previous.
			37: function() {
				_.previous();
			}

	},

	/**
	 * Initialize properties.
	 */
	initProperties: function() {

		// Window, body.
			_.$window = $(window);
			_.$body = $('body');

		// Thumbnails.
			_.$thumbnails = $('#thumbnails');

		// Viewer.
			_.$viewer = $(
				'<div id="viewer">' +
					'<div class="inner">' +
						'<div class="nav-next"></div>' +
						'<div class="nav-previous"></div>' +
						'<div class="toggle"></div>' +
					'</div>' +
				'</div>'
			).appendTo(_.$body);

		// Nav.
			_.$navNext = _.$viewer.find('.nav-next');
			_.$navPrevious = _.$viewer.find('.nav-previous');

		// Main wrapper.
			_.$main = $('#main');

		// Toggle.
			$('<div class="toggle"></div>')
				.appendTo(_.$main);

			_.$toggle = $('.toggle');

	},

	/**
	 * Initialize events.
	 */
	initEvents: function() {

		// Window.

			// Удалить is-preload- * классы при загрузке.
				_.$window.on('load', function() {

					_.$body.removeClass('is-preload-0');

					window.setTimeout(function() {
						_.$body.removeClass('is-preload-1');
					}, 100);

					window.setTimeout(function() {
						_.$body.removeClass('is-preload-2');
					}, 100 + Math.max(_.settings.layoutDuration - 150, 0));

				});

			// Отключить анимацию / переходы при изменении размера.
				var resizeTimeout;

				_.$window.on('resize', function() {

					_.$body.addClass('is-preload-0');
					window.clearTimeout(resizeTimeout);

					resizeTimeout = window.setTimeout(function() {
						_.$body.removeClass('is-preload-0');
					}, 100);

				});

		// Viewer.

			// Скрыть основной упаковщик на кране (<= только средний).
				_.$viewer.on('touchend', function() {

					if (breakpoints.active('<=medium'))
						_.hide();

				});

			// Сенсорные жесты.
				_.$viewer
					.on('touchstart', function(event) {

						// Запишите начальную позицию.
							_.$viewer.touchPosX = event.originalEvent.touches[0].pageX;
							_.$viewer.touchPosY = event.originalEvent.touches[0].pageY;

					})
					.on('touchmove', function(event) {

						// Начальная позиция не записана? Bail.
							if (_.$viewer.touchPosX === null
							||	_.$viewer.touchPosY === null)
								return;

						// Рассчитать вещи.
							var	diffX = _.$viewer.touchPosX - event.originalEvent.touches[0].pageX,
								diffY = _.$viewer.touchPosY - event.originalEvent.touches[0].pageY;
								boundary = 20,
								delta = 50;

						// Свайп влево (далее).
							if ( (diffY < boundary && diffY > (-1 * boundary)) && (diffX > delta) )
								_.next();

						// Свайп вправо (предыдущий).
							else if ( (diffY < boundary && diffY > (-1 * boundary)) && (diffX < (-1 * delta)) )
								_.previous();

						// Исправление оверкролла.
							var	th = _.$viewer.outerHeight(),
								ts = (_.$viewer.get(0).scrollHeight - _.$viewer.scrollTop());

							if ((_.$viewer.scrollTop() <= 0 && diffY < 0)
							|| (ts > (th - 2) && ts < (th + 2) && diffY > 0)) {

								event.preventDefault();
								event.stopPropagation();

							}

					});

		// Main.

			// Сенсорные жесты.
				_.$main
					.on('touchstart', function(event) {

						// Под залог на xsmall.
							if (breakpoints.active('<=xsmall'))
								return;

						// Запишите начальную позицию.
							_.$main.touchPosX = event.originalEvent.touches[0].pageX;
							_.$main.touchPosY = event.originalEvent.touches[0].pageY;

					})
					.on('touchmove', function(event) {

						// Bail on xsmall.
							if (breakpoints.active('<=xsmall'))
								return;

						// Начальная позиция не записана? Bail.
							if (_.$main.touchPosX === null
							||	_.$main.touchPosY === null)
								return;

						// Рассчитать материал.
							var	diffX = _.$main.touchPosX - event.originalEvent.touches[0].pageX,
								diffY = _.$main.touchPosY - event.originalEvent.touches[0].pageY;
								boundary = 20,
								delta = 50,
								result = false;

						// Свайп чтобы закрыть.
							switch (_.settings.mainSide) {

								case 'left':
									result = (diffY < boundary && diffY > (-1 * boundary)) && (diffX > delta);
									break;

								case 'right':
									result = (diffY < boundary && diffY > (-1 * boundary)) && (diffX < (-1 * delta));
									break;

								default:
									break;

							}

							if (result)
								_.hide();

						// Исправление оверкролла.
							var	th = _.$main.outerHeight(),
								ts = (_.$main.get(0).scrollHeight - _.$main.scrollTop());

							if ((_.$main.scrollTop() <= 0 && diffY < 0)
							|| (ts > (th - 2) && ts < (th + 2) && diffY > 0)) {

								event.preventDefault();
								event.stopPropagation();

							}

					});
		// Тумблер.
			_.$toggle.on('click', function() {
				_.toggle();
			});

			// Предотвратить всплывание события до события «Скрыть событие при нажатии».
				_.$toggle.on('touchend', function(event) {
					event.stopPropagation();
				});

		// Навигационный.
			_.$navNext.on('click', function() {
				_.next();
			});

			_.$navPrevious.on('click', function() {
				_.previous();
			});

		// Горячие клавиши.

			// Игнорировать ярлыки внутри элементов формы.
				_.$body.on('keydown', 'input,select,textarea', function(event) {
					event.stopPropagation();
				});

			_.$window.on('keydown', function(event) {

				// Игнорировать, если xsmall активен.
					if (breakpoints.active('<=xsmall'))
						return;

				// Проверьте код ключа
					if (event.keyCode in _.keys) {

						// Остановите другие события.
							event.stopPropagation();
							event.preventDefault();

						// Быстрый вызов
							(_.keys[event.keyCode])();

					}

			});

	},

	/**
	 * Инициализировать зрителя.
	 */
	initViewer: function() {

		// Привязать событие клика.
			_.$thumbnails
				.on('click', '.thumbnail', function(event) {

					var $this = $(this);

					// Остановите другие события.
						event.preventDefault();
						event.stopPropagation();

					// Закрытая? Blur.
						if (_.locked)
							$this.blur();

					// Переключитесь на слайд этого эскиза.
						_.switchTo($this.data('index'));

				});

		// Создавайте слайды из миниатюр.
			_.$thumbnails.children()
				.each(function() {

					var	$this = $(this),
						$thumbnail = $this.children('.thumbnail'),
						s;

					// Слайд-объект.
						s = {
							$parent: $this,
							$slide: null,
							$slideImage: null,
							$slideCaption: null,
							url: $thumbnail.attr('href'),
							loaded: false
						};

					// Родитель.
						$this.attr('tabIndex', '-1');

					// Горка.

						// Создать элементы.
	 						s.$slide = $('<div class="slide"><div class="caption"></div><div class="image"></div></div>');

	 					// Образ.
 							s.$slideImage = s.$slide.children('.image');

 							// Установить фоновые материалы.
	 							s.$slideImage
		 							.css('background-image', '')
		 							.css('background-position', ($thumbnail.data('position') || 'center'));

						// Подпись.
							s.$slideCaption = s.$slide.find('.caption');

							// Переместите все * кроме * самого эскиза в подпись.
								$this.children().not($thumbnail)
									.appendTo(s.$slideCaption);

					// Preload?
						if (_.settings.preload) {

							// Принудительно загрузить изображение.
								var $img = $('<img src="' + s.url + '" />');

							// Установите фоновое изображение слайда.
								s.$slideImage
									.css('background-image', 'url(' + s.url + ')');

							// Пометить слайд как загруженный.
								s.$slide.addClass('loaded');
								s.loaded = true;

						}

					// Добавить в слайды массив.
						_.slides.push(s);

					// Установить индекс миниатюры.
						$thumbnail.data('index', _.slides.length - 1);

				});

	},

	/**
	 * Инициализировать вещи.
	 */
	init: function() {

		// Контрольные точки.
			breakpoints({
				xlarge:  [ '1281px',  '1680px' ],
				large:   [ '981px',   '1280px' ],
				medium:  [ '737px',   '980px'  ],
				small:   [ '481px',   '736px'  ],
				xsmall:  [ null,      '480px'  ]
			});

		// Все остальное.
			_.initProperties();
			_.initViewer();
			_.initEvents();

		// Показать первый слайд, если xsmall не активен.
			breakpoints.on('>xsmall', function() {

				if (_.current === null)
					_.switchTo(0, true);

			});

	},

	/**
	 * Переключиться на конкретный слайд.
	 * @param {integer} index Индекс.
	 */
	switchTo: function(index, noHide) {

		// Уже в index и xsmall не активен? Bail.
			if (_.current == index
			&&	!breakpoints.active('<=xsmall'))
				return;

		// Закрытая? Bail.
			if (_.locked)
				return;

		// Замок.
			_.locked = true;

		// Скрыть основную обертку, если среда активна.
			if (!noHide
			&&	breakpoints.active('<=medium'))
				_.hide();

		// Получить слайды.
			var	oldSlide = (_.current !== null ? _.slides[_.current] : null),
				newSlide = _.slides[index];

		// Обновление тока.
			_.current = index;

		// Деактивировать старый слайд (если он есть).
			if (oldSlide) {

				// Thumbnail.
					oldSlide.$parent
						.removeClass('active');

				// Слайд.
					oldSlide.$slide.removeClass('active');

			}

		// Активировать новый слайд.

			// Thumbnail.
				newSlide.$parent
					.addClass('active')
					.focus();

			// Слайд.
				var f = function() {

					// Старый слайд существует? Отделите это.
						if (oldSlide)
							oldSlide.$slide.detach();

					// Прикрепить новый слайд.
						newSlide.$slide.appendTo(_.$viewer);

					// Новый слайд еще не загружен?
						if (!newSlide.loaded) {

							window.setTimeout(function() {

								// Пометить как загрузку.
									newSlide.$slide.addClass('loading');

								// Подождите, пока он загрузится.
									$('<img src="' + newSlide.url + '" />').on('load', function() {
									//window.setTimeout(function() {

										// Установить фоновое изображение.
											newSlide.$slideImage
												.css('background-image', 'url(' + newSlide.url + ')');

										// Пометить как загруженный.
											newSlide.loaded = true;
											newSlide.$slide.removeClass('loading');

										// Отметить как активный.
											newSlide.$slide.addClass('active');

										// Разблокировка.
											window.setTimeout(function() {
												_.locked = false;
											}, 100);

									//}, 1000);
									});

							}, 100);

						}

					// Иначе ...
						else {

							window.setTimeout(function() {

								// Отметить как активный
									newSlide.$slide.addClass('active');

								// Разблокировка.
									window.setTimeout(function() {
										_.locked = false;
									}, 100);

							}, 100);

						}

				};

				//Нет старого слайда? Переключайся немедленно.
					if (!oldSlide)
						(f)();

				// В противном случае подождите, пока старый слайд исчезнет первым.
					else
						window.setTimeout(f, _.settings.slideDuration);

	},

	/**
	 * Переключается на следующий слайд.
	 */
	next: function() {

		// Рассчитайте новый индекс.
			var i, c = _.current, l = _.slides.length;

			if (c >= l - 1)
				i = 0;
			else
				i = c + 1;

		// Переключатель.
			_.switchTo(i);

	},

	/**
	 * Переключение на предыдущий слайд.
	 */
	previous: function() {

		// Рассчитайте новый индекс.
			var i, c = _.current, l = _.slides.length;

			if (c <= 0)
				i = l - 1;
			else
				i = c - 1;

		// Переключатель.
			_.switchTo(i);

	},

	/**
	 * Переключается на слайд «выше» тока.
	 */
	up: function() {

		// Полноэкранный? Bail.
			if (_.$body.hasClass('fullscreen'))
				return;

		// Рассчитайте новый индекс.
			var i, c = _.current, l = _.slides.length, tpr = _.settings.thumbnailsPerRow;

			if (c <= (tpr - 1))
				i = l - (tpr - 1 - c) - 1;
			else
				i = c - tpr;

		// Переключатель.
			_.switchTo(i);

	},

	/**
	 * Переключается на слайд «ниже» текущего.
	 */
	down: function() {

		// Полноэкранный? Bail.
			if (_.$body.hasClass('fullscreen'))
				return;

		// Рассчитайте новый индекс.
			var i, c = _.current, l = _.slides.length, tpr = _.settings.thumbnailsPerRow;

			if (c >= l - tpr)
				i = c - l + tpr;
			else
				i = c + tpr;

		// Переключатель.
			_.switchTo(i);

	},

	/**
	 * Показывает главную обертку.
	 */
	show: function() {

		// Уже видно? Bail.
			if (!_.$body.hasClass('fullscreen'))
				return;

		// Показать основную обертку.
			_.$body.removeClass('fullscreen');

		// Фокус.
			_.$main.focus();

	},

	/**
	 * Скрывает главную обертку.
	 */
	hide: function() {

		// Уже спрятан? Bail.
			if (_.$body.hasClass('fullscreen'))
				return;

		// Скрыть главную обертку.
			_.$body.addClass('fullscreen');

		// Пятно.
			_.$main.blur();

	},

	/**
	 * Включает основной упаковщик.
	 */
	toggle: function() {

		if (_.$body.hasClass('fullscreen'))
			_.show();
		else
			_.hide();

	},

}; return _; })(jQuery); main.init();