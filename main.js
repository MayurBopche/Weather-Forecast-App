const API_KEY = "477e8cd07a0dab5d92b96b36af4f2043";
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
let selectedCityText;
let selectedCity;

//get the data from APIs

    //1. get current weather data
    const getCurrentWeatherData = async({lat, lon, name:city})=>{

        const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);
        return response.json();
    };
    //2. get hourly forecast data
    const getHourlyForecast = async({name : city})=>{

        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
        const data = await response.json();
        return data.list.map(forecast => {
            const {main: {temp, temp_max, temp_min}, dt, dt_txt, weather: [{description, icon}]} = forecast; 
            return {temp, temp_max, temp_min, dt, dt_txt, description, icon};
        });
    }
    //3. get cities data
    const getCitiesUsingGeoLocation = async(searchText)=>{
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`);
        return response.json();
    }

//few utility functions

    //1. formats temperature value to one decimal e.g. 22.5°C 

    const formatTemp = (temp) => `${temp?.toFixed(1)}°C`; //optional chaining, checks if variable is null or not

    //2. gets the icon URL for particular icon ID

    const createIconURL = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

    //3. formats time (04:00:00 to 4 PM)
    
    const timeFormatter = Intl.DateTimeFormat("en", {
        hour12: true, hour: "numeric"
    }); 


//load the gathered data from APIs into the site 
// (changing content of app elements)   

    //1. load current forecast
    const loadCurrentForecast = /*object destructuring*/ ({name, main:{temp, temp_max, temp_min} , weather:[{description}]}) => {
        
        // <h1>City Name</h1>
        //  <p class="temp">Temp</p>
        //  <p class="description">Description</p>
        //  <p class="min-max-temp">H L</p>

        //changes the content of above elements

        const currentForecast  = document.querySelector('#current-forecast');

        currentForecast.querySelector('h1').textContent = name;
        currentForecast.querySelector('.temp').textContent = formatTemp(temp);
        currentForecast.querySelector('.description').textContent = description;
        currentForecast.querySelector('.min-max-temp').textContent = `H: ${formatTemp(temp_max)}  L:${formatTemp(temp_min)}`;
    };

    //2. load hourly forecast
    const loadHourlyForecast = ({main:{temp : tempNow} , weather:[{icon: iconNow}]}, hourlyForecast)=>{
        // currentweather(object)  , hourlyForecast(array)

        let dataFor12Hours = hourlyForecast.slice(2, 14);
        //ignoring first hour as we need to match it with current weather info

        
        const hourlyContainer = document.querySelector('.hourly-container'); //target

        let innerHTMLString = `<article>
            <h2 class="time">Now</h2> 
            <img class="icon" src="${createIconURL(iconNow)}">
            <p class="hourly-temp">${formatTemp(tempNow)}</p>
        </article>`; //initialized with first(current) hour info

        for(let {temp, icon, dt_txt} of dataFor12Hours){
            innerHTMLString += `<article>
                <h2 class="time">${timeFormatter.format(new Date(dt_txt))}</h2>
                <img class="icon" src="${createIconURL(icon)}">
                <p class="hourly-temp">${formatTemp(temp)}</p>
            </article>`;
        } //looping for each next hours

        hourlyContainer.innerHTML = innerHTMLString; //change target content

    };

    //3. load feels like
    const loadFeelsLike = ({main: {feels_like} })=>{
        let container = document.querySelector('#feels-like');
        container.querySelector('.feels-like-temp').textContent = feels_like;
    }; 

    //4. load humidity
    const loadHumidity = ({main: {humidity} })=>{
        let container = document.querySelector('#humidity');
        container.querySelector('.humidity-value').textContent = `${humidity} %`;
    }; 

    //5. load five-day forecast

    //5.a. group all the entries having same day in hourlyForecast
    //     and figure out the max min for each day

    const calculateDayWiseForecast = (hourlyForecast) => {
        let dayWiseMappedForecast = new Map();

        for(let forecast of hourlyForecast){//traversing array of objects
            
            const [date] = forecast.dt_txt.split(" ");
            const day = DAYS[new Date(date).getDay()];
            //gives the 'day' info of the current object


            if(dayWiseMappedForecast.has(day)){
                let forecastForTheDay = dayWiseMappedForecast.get(day);
                forecastForTheDay.push(forecast);
                dayWiseMappedForecast.set(day, forecastForTheDay);
            }
            else{
                dayWiseMappedForecast.set(day, [forecast]);
            }
        }//maps the objects with their 'day's

        for(let [key, value] of dayWiseMappedForecast){ //traversing the map and modifying
            let temp_min = Math.min(...Array.from(value, val => val.temp_min));
            let temp_max = Math.max(...Array.from(value, val => val.temp_max));
            //temp = min/max-from-parameters( spreading-the-array( convert-to-array-of-min/max( array-of-objects , map callback function)))

                    //why using array.from instead of map function??
                    //array.from() works for any type, including array whereas map works only for array, and its a bit faster

            dayWiseMappedForecast.set(key , {temp_min, temp_max, icon: value.find(v => v.icon).icon});
        }//finds the min-max and icon for each day and maps it with day

        return dayWiseMappedForecast;
    }

    //5.b. load five-day forecast 
    
    const loadFiveDayForecast = (hourlyForecast)=>{
        
        let dayWiseMappedForecast = calculateDayWiseForecast(hourlyForecast);//gives array of "objects with required info" mapped with day
        const container = document.querySelector('.fiveday-forecast-container');//target
        let dayWiseInfo = ""; //string of info to load

        // Array.from(dayWiseMappedForecast).map(([day, {temp_max, temp_min, icon}],index)=>{
        
        //     if(index<5){//only for 5 days
        //             dayWiseInfo += `
        //             <article class="day-wise-forecast">
        //                 <h3 class="day">${index == 0 ? "Today" : day}</h3>
        //                 <img class="icon" src="${createIconURL(icon)}" alt="icon for the forecast">
        //                 <p class="min-temp">${formatTemp(temp_min)}</p>
        //                 <p class="max-temp">${formatTemp(temp_max)}</p> 
        //             </article>`;
        //     }
        //     else{
        //         return;
        //     }

        // });
        let arr = Array.from(dayWiseMappedForecast);
        for(let i=0;i<5;i++){
            let [day, {temp_max, temp_min, icon}] = arr[i];
            dayWiseInfo += `
                         <article class="day-wise-forecast">
                             <h3 class="day">${i== 0 ? "Today" : day}</h3>
                             <img class="icon" src="${createIconURL(icon)}" alt="icon for the forecast">
                             <p class="min-temp">${formatTemp(temp_min)}</p>
                             <p class="max-temp">${formatTemp(temp_max)}</p> 
                         </article>`;
        }

        container.innerHTML = dayWiseInfo;
    };
    //6 on change in search box, run

    //debounce function, so that instead of making calls for each letter typed in searchbox, it calls only once every few seconds
    function debounce(func){
        let timer;
        return (...args)=>{
            clearTimeout(timer);
            timer = setTimeout(()=>{
                func.apply(this, args);  
            }, 500);
        }
    }

    const onSearchChange = async (e) =>{
        let {value} = e.target;
        if(!value){
            selectedCity = null;
            selectedCityText = '';
        }
        if(value && (selectedCityText !== value)){
            const listOfCities = await getCitiesUsingGeoLocation(value);
            let options = ``;
            for(let {lat, lon, name, state, country} of listOfCities){
                options += `<option data-city-details='${JSON.stringify({lat, lon, name})}'  value="${name}, ${state}, ${country}"></option>`
            }
            
            document.querySelector('#cities').innerHTML = options;
        }
    }

    const handleCitySelection = (e) => {
        selectedCityText = e.target.value;
        let options = document.querySelectorAll('#cities > option');
        if(options?.length){
            let selectedOption = Array.from(options).find(option => option.value === selectedCityText);
            console.log(selectedOption);
            selectedCity = JSON.parse(selectedOption.getAttribute('data-city-details'));
            loadData();
        }
    }

    //loads data by using location of user 
    const loadForecastUsingGeoLocation = ()=>{
        navigator.geolocation.getCurrentPosition(({coords})=>{
            const {latitude:lat, longitude:lon} = coords;
            selectedCity = {lat,lon};
            loadData();
        }, error => console.log(error));
    }

    const loadData = async ()=>{
        const currentWeather = await getCurrentWeatherData(selectedCity);
        loadCurrentForecast(currentWeather);

        const hourlyForecast = await getHourlyForecast(currentWeather);
        loadHourlyForecast(currentWeather, hourlyForecast);
        
        loadFeelsLike(currentWeather);
        loadHumidity(currentWeather);
        loadFiveDayForecast(hourlyForecast);
    }

    const debounceSearch = debounce((event) => onSearchChange(event));


// update site when content is loaded 

document.addEventListener('DOMContentLoaded', async()=>{

    loadForecastUsingGeoLocation();
    //search on every input change
    const searchInput = document.querySelector('#search');
    searchInput.addEventListener('input', debounceSearch);
    searchInput.addEventListener('change', handleCitySelection);

    
});