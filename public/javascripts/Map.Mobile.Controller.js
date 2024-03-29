// Namespace
if (!this.Map || typeof this.Map !== 'object') {
    this.Map = {};
}

//This is our static module
Map.Controller = (function ($) {
    /////////////////
    //PRIVATE VARIABLES
    var me = {},
    _map,   
		_mcLayer,
		_disasterLayer, _fiResponseLayer,
		_socket = {},
		_isDriver = false,
		_menuOpen = false,
    _currentMarkerType = '';

    /////////////////
    //PRIVATE METHODS
    function _initMap(){
		_map = new L.Map('map'); 
		
		//var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/e157614f2e585e679ee4a14551192a57/997/256/{z}/{x}/{y}.png',
		//    cloudmadeAttrib = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade';
		//_disasterLayer = new L.TileLayer(cloudmadeUrl, {maxZoom: 18, attribution: cloudmadeAttrib});

		//var mcUrl = 'http://{s}.tile.cloudmade.com/e157614f2e585e679ee4a14551192a57/999/256/{z}/{x}/{y}.png';
		//_mcLayer = new L.TileLayer(mcUrl, {maxZoom: 18, attribution: cloudmadeAttrib});
	
		//var start = new L.LatLng(39.50404070558415,-96.9873046875); // geographical point (longitude and latitude) 
		
		
		
		 var esriStreetMapUrl = 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          esriAttrib = 'Map data &copy: 2012 Esri';
      _disasterLayer = new L.TileLayer(esriStreetMapUrl, {maxZoom: 18, attribution: esriAttrib}); 
      //firesponse data http://173.160.60.67/ArcGIS/rest/services/fiResponse_SanDiego/MapServer
      _fiResponseLayer = new L.AgsDynamicLayer(
          'http://173.160.60.67/ArcGIS/rest/services/fiResponse_SanDiego/MapServer',
          { maxZoom: 19,
              attribution: "FiResponse",
              opacity: 1,
              layers: 'show:1,4,7,8,9' });
      
      
      var start = new L.LatLng(32.89689, -116.90758);  //san diego
                              
      _map.setView(start, 8).addLayer(_disasterLayer).addLayer(_fiResponseLayer);
      //_map.setView(start, 4).addLayer(_disasterLayer); //.addLayer(nexradLayer);
		
	}


    //--------------------------------------
    //setup events and socket.io
    //--------------------------------------
    function _initIO(){  
        //setup the ioWapper
        _ioWrapper = new IOWrapper();
        //Get the existing points right away...
        _ioWrapper.getPoints();
        _ioWrapper.bind('updateMap', function(data){
            console.log('Got Update Map during init ' + data.lat + ' ' + data.lng + ' ' + data.zoom);
            _map.setView(new L.LatLng(data.lat,data.lng), data.zoom);    
        });
        _ioWrapper.bind('pointAdded', _addPointToMap);

        _ioWrapper.bind('wii', function(data){
            console.log('Got wii:', data);
            var s = _map.getSize().y / 2; 
           _map.panBy(new L.Point(data.x * s,data.y * s)); 
        });  

		_ioWrapper.bind('userCountUpdate', function(data){ 
		   console.log('updating user count...', data);
		   $('#userCount').text(data.count + ' users');
		});
        
    }   
	
		
	function _getMarker(markerType) {
        var iconUrl = 'images/'.concat(markerType).concat('-mobile.png'),
        icon = L.Icon.extend({   
            iconSize: new L.Point(32, 32),
            //shadowSize: new L.Point(47, 37),
            iconAnchor: new L.Point(16, 16),
            shadowUrl: null,
            iconUrl: iconUrl
        });
        return new icon();
    }

	
	
	//add a point to the map
	function _addPointToMap(data) {
		console.log('Adding point to the map ' + data.pointType);
		_map.addLayer(new L.Marker(new L.LatLng(data.lat, data.lng), { icon: _getMarker(data.pointType)}));
	
    }
    	
	//Main map tap handler
	function _addPointMapClickHandler(e) {
		//create the data to send to server and add to map
        var data = {
			pointType:_currentMarkerType, 
			lat:e.latlng.lat, 
			lng:e.latlng.lng
		};
		//add the point to the local map
		_addPointToMap(data);
		//send to the server to update all other maps
		//and store in the database
    _ioWrapper.addMapPoint(data);
     // remove the handler   
		_map.off('click', _addPointMapClickHandler); 
		//deactivate the button
		$('.active').removeClass('active');
	}      
	
	
    
    ////////////////
    //PUBLIC METHODS
    me.getMap = function () { return _map; };
    me.init = function (args) {
        _initMap();
		_initIO();       
		
		$('.circle-container').on('click','.circle', function(){
		  console.log('got circle click');
		  if(_menuOpen){      
		    move('#fire').ease('in-out').y(0).rotate(360).end();
        move('#deaths').ease('in-out').y(0).rotate(360).end();
        move('#road-damage').ease('in-out').y(0).rotate(360).end();
        move('#road-impassable').ease('in-out').y(0).rotate(360).end();
        move('#damaged-building').ease('in-out').y(0).rotate(360).end(); 
        move('#destroyed-building').ease('in-out').y(0).rotate(360).end(); 
        move('#gps').ease('in-out').x(0).rotate(360).end();
		    _menuOpen = false;
		  } else {
		    move('#fire').ease('in-out').y(-210).rotate(-360).end();
        move('#deaths').ease('in-out').y(-170).rotate(-360).end();
        move('#road-damage').ease('in-out').y(-130).rotate(-360).end();
        move('#road-impassable').ease('in-out').y(-90).rotate(-360).end();
        move('#damaged-building').ease('in-out').y(-50).rotate(-360).end(); 
        move('#destroyed-building').ease('in-out').y(-50).rotate(-360).end(); 
        move('#gps').ease('in-out').x(50).rotate(-360).end();
		    _menuOpen = true;
		  }
		});
		$('ul.items').on('click', 'li', function(evt){ 
		    if($(this).is('#gps') == false){
            _currentMarkerType = $(this).data('type');
            //$('#message').text('Click on map to set point location.');
            $('.active').removeClass('active'); 
            $(this).addClass('active');
            _map.on('click', _addPointMapClickHandler);
         }else{
           //this is GPS - lets do it!
           if (navigator.geolocation) {
               navigator.geolocation.getCurrentPosition(function(position){
               var loc = new L.LatLng(position.coords.latitude, position.coords.longitude);
               _map.setView(loc, 14);
             }, 
             function(msg){
                alert('Error with GPS');
             });
           } else {
             error('not supported');
           }
         } 
     });
		
		
    };

    return me;

} ($));
//we pass $ in so js doesn't have to walk the scope chain - $ is now local to this closure.
