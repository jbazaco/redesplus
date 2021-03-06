
var user_buttons;
var map;
var unselect_icon;
var select_icon;

$(function() {
	// create a map in the "map" div, set the view to a given place and zoom
	map = L.map('map').setView([40.2838, -3.8215], 5);

	// add an OpenStreetMap tile layer
	L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
		attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'
	}).addTo(map);
	
	//Para ampliar y centrar el mapa en la posicion del usuario
	map.locate({setView: true, maxZoom: 12});

	//Crea los botones de eliminar un usuario y solicitar su actividad
	(function() {
		var trash = $('<button>').addClass('btn btn-danger trash-but')
								.attr('title', 'Eliminar usuario');
		trash.append($('<span>').addClass('glyphicon glyphicon-trash'));
		var activity = $('<button>').addClass('btn btn-primary activity-but')
									.attr('title', 'Mostrar/Ocultar actividad');
		activity.append($('<span>').addClass('glyphicon glyphicon-list-alt'));
		user_buttons = $('<div>').addClass('user_buttons').append(activity).append(trash);
	})();

	//Despliega/oculta el formulario para buscar gente
	$('#show_search_people button').click(function() {
		$('#search_people_box').toggle('drop', {}, 300);
		$('#add_circles').toggleClass('my_hidden');
		$('#show_search_people').parent().toggleClass('opaque', 0);
		$(this).toggleClass('btn-info btn-danger', 0);
		$('#show_search_people > button > span').toggleClass('hidden', 0);
	});

	$('#search_people_box > form').submit(function(event) {
		event.preventDefault();
		var uid = $('#search_people_box input').val();
		if (uid) {
			addUser(uid);
		}
	});

	//Imprime los usuarios que hay en local storage
	if(typeof(Storage)!=="undefined") {
		var storaged_user;
		for(var key in localStorage) {
			storaged_user = $.parseJSON(localStorage[key]);
			printUserBox(key, storaged_user.name, storaged_user.img)
		}
	}

	$("#people").sortable();
	
	$('#photos_container').stick_in_parent({
			inner_scrolling: false //para que siempre se vea el nombre de la 
									//ciudad en pantallas con poca altura
	}); //para que la barra de imagenes siga el scroll
	$('#photos').slick(); //para que la primera vez que pinte las imagenes pueda hacer unslick()

	unselect_icon = L.AwesomeMarkers.icon({
			prefix: 'glyphicon',
			icon: 'plus-sign',
			markerColor: 'blue'
		});
	select_icon = L.AwesomeMarkers.icon({
			prefix: 'glyphicon',
			icon: 'ok-sign',
			markerColor: 'green'
		});

	$('#people').on('mouseenter', '.user_box > div', function(event) {
		$(this).children('.user_buttons').css('visibility','visible');
	});
	$('#people').on('mouseleave', '.user_box > div', function(event) {
		$(this).children('.user_buttons').css('visibility','hidden');
	});
	$('#people').on('click', '.user_buttons > .trash-but', function(event) {
		var uid = getUID($(this).parents('.user_box').attr('id')); 
		deleteUser(uid);
	});
	$('#people').on('click', '.user_buttons > .activity-but', function(event) {
		var uid = getUID($(this).parents('.user_box').attr('id'));
		showUserActivity(uid)
	});

	//Para cuando se abre o se cierra un acordeon recalcular la altura para las fotos
	$('#people').on('click', '.replies h3', function(event) {
		setTimeout(function() {
			$('#photos_container').trigger("sticky_kit:recalc"); //necesario por el
																 //cambio de altura
		}, 1000);
	});

	// Cuando se hace scroll brusco y se esta recalculando el sticky element puede ponerse
	// el atributo style="position: relative" haciendo inaccesible el mapa y los botones
	// de la izquierda. Para solucionarlo se elimna ese atributo
	window.setInterval(function() {
		if ($('#maincontent').attr('style')) $('#maincontent').removeAttr('style');
	}, 3000);

	//Para desmarcar todos los markers del mapa
	$('#uncheck_tabs > button').click(function() {
		removePlaceAndPhotos();
		$('.comments li.selected > a').each(function() {
			var id_layer = Number($(this).attr('id').split('marker_')[1]);
			var marker = map._layers[id_layer];
			marker.setIcon(unselect_icon);
			$(this).parent().removeClass('selected');
		});
	});

	$('#sign-out').click(function() {
		gapi.auth.signOut();
		gapi.auth.setToken('');
		$('#sign-out').addClass('hidden');
		$('#authorize-button').removeClass('hidden');
		$('#add_circles').addClass('hidden');
	});

	$('#authorize-button').click(handleAuthClick);

	$('#add_circles').click(showCircles);
	$('#finish_adding_circles').click(function() {
		$('#circle_people').addClass('hidden');
		$('#maincontent').removeClass('hidden');
	});
});

// Enter a client ID for a web application from the Google Developer Console.
// The provided clientId will only work if the sample is run directly from
// http://watson.gsyc.es or http://localhost:8000
// In your Developer Console project, add a JavaScript origin that corresponds to the domain
// where you will be running the script.
var clientId = '1069225346334.apps.googleusercontent.com';

// Enter the API key from the Google Develoepr Console - to handle any unauthenticated
// requests in the code.
// The provided key works for this sample only when run from
// http://watson.gsyc.es/~jbazaco/* or http://localhost:8000/*
// To use in your own application, replace this API key with your own.
var apiKey = 'AIzaSyAZ1sXoSg1mL7qKH0PXgVKbc5BxUXTZPD8';

// To enter one or more authentication scopes, refer to the documentation for the API.
var scopes = 'https://www.googleapis.com/auth/plus.login';

// Use a button to handle authentication the first time.
function handleClientLoad() {
	gapi.client.setApiKey(apiKey);
	window.setTimeout(checkAuth, 1);
}

function checkAuth() {
	gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
}

/* Pone el boton de iniciar sesion o cerrar sesion segun corresponda y hace 
	visible el boton de agregar desde circulos si la sesion esta iniciada */
function handleAuthResult(authResult) {
	var authorizeButton = document.getElementById('authorize-button');
	if (authResult && !authResult.error) {
		$('#authorize-button').addClass('hidden');
		$('#sign-out').removeClass('hidden');
		$('#add_circles').removeClass('hidden');
	} else {
		$('#sign-out').addClass('hidden');
		$('#authorize-button').removeClass('hidden');
		$('#add_circles').addClass('hidden');
	}
}

function handleAuthClick(event) {
	gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult);
	return false;
}

/* A partir del id del div de un usuario obtiene el id del usuario en G+
	El id va precedido de user_ y si es una cadena de strings se tiene que 
	poner un '+' delante */
function getUID(id_div) {
	var uid = id_div.split('user_')[1];
	if (! /\d+/.test(uid))
		uid = '+' + uid;
	return uid;
}

/* Pone al usuario de G+ con id 'uid' en tu lista de amigos */ 
function addUser(uid) {
	gapi.client.load('plus', 'v1', function() {
		var request = gapi.client.plus.people.get({
			'userId': uid
		});
		request.execute(function(resp) {
			if (resp.error) {
				var error;
				if (resp.code === 404)
					error = "El usuario no existe";
				else
					error = 'Error #' + resp.code;
				$('#alert').append($('<div>').addClass('alert alert-danger').text(error));
				$('#alert').show('shake', {}, 500, function(){
					setTimeout(function() {
						$('#alert').hide('drop', {}, 1000, function() {
							$('#alert').html('');									
						});
					}, 1000);
				});
				return;
			}
			if (uid === 'me') uid = resp.id;
			$('#search_people_box input').val('');
			$('#show_search_people button').click();
			var img = resp.image.url;
			var name = resp.displayName;
			var iduser = printUserBox(uid, name, img);
			$('body').scrollTo('#' + iduser, 1000);
			saveUser(uid, name, img);
		});
	});
}

/* Pone una caja con el nombre y la foto de un usuario en el elemento #people
	En caso de que el usuario ya este representado se pondra al principio del todo
	Devuelve la id del div del usuario */
function printUserBox(uid, uname, uimg) {
	var iduser = 'user_' + uid.replace(/\+/, '');
	var user_wrapper = $('<div>').addClass('col-xs-6 col-md-3 user_box').attr('id', iduser);
	var new_user = $('<div>');
	new_user.append($('<img>').attr('src', uimg).addClass(
							'img-rounded img-responsive center-block'));
	new_user.append($('<span>').text(uname).addClass('name'));
	user_buttons.clone().appendTo(new_user);
	new_user.appendTo(user_wrapper);
	if ($('#' + iduser).length) $('#' + iduser).remove();
	user_wrapper.prependTo($('#people'));
	$('#photos_container').trigger("sticky_kit:recalc"); //necesario por el cambio de altura
	return iduser;
}

/* Guarda en localStorage al usuario agregado */
function saveUser(uid, uname, uimg) {
	var user = {'name': uname, 'img': uimg};
	localStorage.setItem(uid , JSON.stringify(user));
}

/* Elimina al usuario de G+ con id uid de la lista de usuarios mostrados, borrandolo tanto de la
	pantalla como de localstorage */
function deleteUser(uid) {
	localStorage.removeItem(uid);
	var iduser = 'user_' + uid.replace(/\+/, '');
	if ($('#' + iduser).length) $('#' + iduser).remove();
}

/* Obtiene e imprime la actividad del usuario con id uid y tambien los comentarios
	asignados a cada actividad si los hubiese */
function getUserActivity(uid) {
	gapi.client.load('plus', 'v1', function() {
		var request = gapi.client.plus.activities.list({
			'collection': 'public',
			'userId': uid,
			'maxResults': 10,
		});
		request.execute(function(resp) {
			var listing = $('<ul>');
			listing.addClass('comments');
			if (resp.items) {
				var locations = [];
				for (i=0;i<resp.items.length;i++) {
					var item = $('<li>');
					listing.append(item);
					item.attr('id', resp.items[i].id);
					if (resp.items[i].location) {
						locations.push(resp.items[i].location);
						location_link = set_location(resp.items[i].location);
						item.append(location_link);
						location_link.click(selectMapMarker);
					}
					item.append($('<div>').addClass('activity').html(resp.items[i].object.content));
					if (resp.items[i].object.replies.totalItems > 0) {
						//Respuestas a una actividad
						var accordion_all = $('<div>').addClass('replies');
						var accordion_title = $('<h3>').html('Mostrar <span>0</span> respuestas');
						var replies = $('<ul>');
						accordion_all.append(accordion_title).append($('<div>').append(replies));
						item.append(accordion_all);
						accordion_all.hide();
						getActivityReplies(resp.items[i].id);
					}
					listing = listing;
				}
				centerMapLocations(locations);
			} else {
				listing.append($('<li>').html('El usuario no tiene ninguna actividad p&uacute;blica.'));
			}
			var iduser = 'user_' + uid.replace(/\+/, '');
			$('#' + iduser + ' > div').append(listing);
			$('#photos_container').trigger("sticky_kit:recalc"); //necesario por el cambio de altura
		});
	});
}

/* Solicita y escribe las respuestas a una actividad */
function getActivityReplies(aid) {
	var request = gapi.client.plus.comments.list({'activityId': aid,});
	request.execute(function(resp) {
		var comment_id = resp.items[0].id.split('.')[0];
		for (i=0;i<resp.items.length;i++) {
			var replies = $('#' + comment_id + ' .replies ul');
			replies.append($('<li>').html(resp.items[i].actor.displayName + 
											": " + resp.items[i].object.content));
		}
		$('#' + comment_id + ' .replies h3 > span').text(resp.items.length);
		$('.replies').accordion({
					heightStyle: "content", 
					collapsible: true, 
					active: false
		});
		$('#' + comment_id + ' .replies').show();
		$('#photos_container').trigger("sticky_kit:recalc"); //necesario por el cambio de altura
	});
}

/* Muestra la actividad del usuario con id uid o la oculta si ya estaba
	mostrandose. Ademas si se estuviese mostrando la informacion de algun
	otro usuario se ocultara esa informacion */
function showUserActivity(uid) {
	var iduser = 'user_' + uid.replace(/\+/, '');
	removePlaceAndPhotos();
	var selected = $('#' + iduser);
	if (selected.hasClass('selected')) { //Para el caso de que se haya pinchado para cerrarlo
		hideUserActivity(selected);
		$('body').scrollTo('#' + iduser, 1000);
		return;
	}

	//si habia alguno ampliado lo reduce (solo deberia haber uno ampliado cada vez)
	$('#people > div.selected').each(function() {
		hideUserActivity($(this));
	});

	selected.removeClass('col-xs-6');
	selected.removeClass('col-md-3');
	selected.addClass('selected col-xs-12');
	$('#' + iduser + ' .activity-but .glyphicon').toggleClass('glyphicon-th glyphicon-list-alt', 0);
	getUserActivity(uid);
	$('body').scrollTo('#' + iduser, 1000);
}

/* Oculta la actividad de un usuario */
function hideUserActivity(selected) {
	var user_id = selected.attr('id');

	$('#' + user_id + ' a.location').each(function() { //Borra los marcadores del mapa de sus comentarios
		var id_layer = Number($(this).attr('id').split('marker_')[1]);
		map.removeLayer(map._layers[id_layer]);
	});
	
	$('#' + user_id + ' .comments').remove();
	selected.removeClass('selected col-xs-12').addClass('col-xs-6 col-md-3');
	$('#' + user_id + ' .activity-but > .glyphicon').toggleClass('glyphicon-th glyphicon-list-alt', 0);
}

/* Genera y devuelve un link con la localizacion y pone una etiqueta en 
	el mapa en la posicion dada */
function set_location(location) {
	var marker = L.marker([location.position.latitude, location.position.longitude],
							{icon: unselect_icon})
												.addTo(map)
												.on('click', markerClicked);
	var link = $('<a>').attr('href', '#')
						.attr('id', 'marker_' + marker._leaflet_id)
						.addClass('location');
	link.html('<span class="glyphicon glyphicon-map-marker"></span> ' + 
				location.displayName + ' [' + 
				parseFloat(location.position.latitude).toFixed(2) + ', ' + 
				parseFloat(location.position.longitude).toFixed(2) + ']');

	return link;
}

/* Resalta el mensaje correspondiente al marcador pulsado y cambia la 
	etiqueta por otra de color verde. 
	Ademas busca el nombre de la ciudad mas cercana mostrando su nombre 
	y unas imagenes que tengan esa etiqueta en Flickr */
function markerClicked() {
	$('#marker_' + this._leaflet_id).parent().addClass('selected');
	if ($('#marker_' + this._leaflet_id + ':in-viewport').length < 1)
		$('body').scrollTo('#marker_' + this._leaflet_id, 1000);
	this.setIcon(select_icon);
	var pos = this.getLatLng();
	$.getJSON('http://nominatim.openstreetmap.org/reverse?format=json&lat=' + 
				pos.lat + '&lon=' + pos.lng + '&zoom=10', processNameLocation);
}

/* Dispara un evento 'click' sobre el marcador del mapa que tiene el id
	presente en el id del enlace pulsado (despues de 'marker_') */
function selectMapMarker(event) {
	event.preventDefault();
	var id_layer = Number($(this).attr('id').split('marker_')[1]);

	//si el marcador no esta en el mapa lo pone en el centro
	var bounds = map.getBounds();
	var pos = map._layers[id_layer]._latlng;
	if (!((bounds._southWest.lat <= pos.lat && pos.lat <= bounds._northEast.lat) && 
			(bounds._southWest.lng <= pos.lng && pos.lng <= bounds._northEast.lng)))
		centerMapGettingLocations();

	map._layers[id_layer].fire('click');
}


var flickrAPI = "http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?";
/* Escribe la ciudad de location en #place y solicita las imagenes de dicha ciudad 
	para mostrarlas */
function processNameLocation(location) {
	var place = location.address.city ? location.address.city : 'Imposible localizar';
	$('#place').text(place);
	$.getJSON(flickrAPI, {
				tags: place.replace(/ /g,','),
				format: 'json'
			}).done(putNewImages);
}

/* Elimina el nombre del ultimo sitio seleccionado y las fotos de Flickr */
function removePlaceAndPhotos() {
	$('#place').text('');
	$('#photos').html('');
}

/* Reemplaza las imagenes si las hay por las nuevas imagenes recibidas en data */
function putNewImages(data) {
	$('#photos').unslick();
	$('#photos').html('');
	$.each(data.items, function(n, img ) {
		$('#photos').append('<div class="mosaicflow__item"><img src="' + img.media.m + 
							'" alt="' + img.title + '"></img><p>' + img.title + '</p></div>');
		if (n === 19) {
			return false;
		}
	});
	$('#photos').slick({
		infinite: true,
		slidesToShow: 3,
		slidesToScroll: 3,
		vertical: true,
		autoplay: true,
		autoplaySpeed: 2000,
		speed: 800,
	});
	$('#photos_container').trigger("sticky_kit:recalc"); //necesario por un posible cambio de altura
}

/* Centra el mapa para que se vean todas las localizaciones */
function centerMapLocations(locations) {
	if (locations.length < 1) return;
	var lats = [];
	var lons = [];
	$.each(locations, function() {
		lats.push(this.position.latitude);
		lons.push(this.position.longitude);
	});
	var maxcorner = L.latLng(Math.max.apply(Math, lats), Math.max.apply(Math, lons));
	var mincorner = L.latLng(Math.min.apply(Math, lats), Math.min.apply(Math, lons));
	// right_offset calcula el espacio que hay desde que empiezan las cajas de los usuarios
	// hasta la derecha del todo
	var right_offset = $('body').width() - $('#people').offset().left;
	// right_offset calcula el espacio que hay hasta que terminan los botones flotantes y pone 10 
	// extra porque la etiqueta tiene altura (asi se evita el solape o se reduce)
	var top_offset = $('#floating_buttons').position().top + $('#floating_buttons').height() + 10;
	map.fitBounds([mincorner, maxcorner], {
					paddingTopLeft: [10, top_offset],
					paddingBottomRight: [right_offset, 0]
				});
}

/* Centra el mapa para que se vean todas las localizaciones que haya marcadas en el mapa
	buscando los enlaces a marcadores*/
function centerMapGettingLocations() {
	var locations = [];
	$('a.location').each(function() {
		var id_layer = Number($(this).attr('id').split('marker_')[1]);
		var pos = map._layers[id_layer].getLatLng();
		locations.push({position: {latitude: pos.lat, longitude: pos.lng}});
	});
	centerMapLocations(locations)
}

/* Muestra los circulos del usuario para poder agregarlos
	Oculta el contenedor con los contactos y el de las imagenes (eliminando su
	actividad y las imagenes si hubiese alguno desplegado) */
function showCircles() {
	$('#show_search_people button').click();
	removePlaceAndPhotos();
	$('#people > div.selected').each(function() {
		hideUserActivity($(this));
	});
	$('#maincontent').addClass('hidden');
	$('#circle_people').removeClass('hidden');
	$('body').scrollTo('#circle_people', 1000);
	gapi.client.load('plus','v1', function(){
		var request = gapi.client.plus.people.list({
			'userId': 'me',
			'collection': 'visible'
		});
		request.execute(function(resp) {
			for (var i = 0; i < resp.items.length; i++) {
				var uid = resp.items[i].id;
				if ($('#user_' + uid.replace(/\+/, '')).length < 1)//Solo los que no tenga agregados
					printUserToAdd(resp.items[i].id, 
									resp.items[i].image.url, 
									resp.items[i].displayName);
				$('.add_user_from_circle').click(addUserFromCircle);
			}
		});
	});
}

/* Imprime el usuario dado en el div #to_add con un boton para agregarlo */
function printUserToAdd(uid, uimg, uname) {
	var iduser = 'user_' + uid.replace(/\+/, '');
	var user_wrapper = $('<div>').addClass('col-xs-6 col-md-3 user_box').attr('id', iduser);
	var new_user = $('<div>');
	new_user.append($('<img>').attr('src', uimg).addClass(
							'img-rounded img-responsive center-block'));
	new_user.append($('<span>').text(uname).addClass('name'));
	new_user.append('<div><button class="btn btn-success add_user_from_circle" type="submit"' +
					'title="agregar usuario"><span class="glyphicon glyphicon-plus"></span>' +
					'<span class="glyphicon glyphicon-user"></span></button></div>');
	new_user.appendTo(user_wrapper);
	user_wrapper.appendTo($('#to_add'));
	return iduser;
}

/* Agrega un usuario desde los circulos del usuario registrado tras pulsar
	el boton para agregarle */
function addUserFromCircle() {
	var uid = getUID($(this).parents('.user_box').attr('id'));
	var iduser = 'user_' + uid.replace(/\+/, '');
	var name = $('#' + iduser + ' span.name').text();
	var img = $('#' + iduser + ' img').attr('src');
	$('#to_add #' + iduser).remove();
	saveUser(uid, name, img);
	printUserBox(uid, name, img);
}
