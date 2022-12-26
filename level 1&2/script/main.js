// functions for level1 button
function level1(){
    document.getElementById("myDropdown").classList.toggle("show")
}
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content")
    var i
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i]
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show')
      }
    }
  }
}

//functions for level2 button
var draw_line = false
function level2(){
    draw_line = !draw_line
    if (draw_line){
        grid_min_lines.attr("stroke", "rgba(60, 100, 180, 0.8)")
        grid_max_lines.attr("stroke", "rgba(200, 0, 30, 0.8)")
    }
    else {
        grid_min_lines.attr("stroke", "rgba(60, 100, 180, 0)")
        grid_max_lines.attr("stroke", "rgba(200, 0, 30, 0)")
    } 
}

// set the dimensions and margins of graph
var margin = { top: 150, right: 60, bottom: 50, left: 60 },
width = 700 - margin.left - margin.right,
height = 800 - margin.top - margin.bottom,
yearNum = 21,
monthNum = 12,
gridHeight = height / yearNum,
gridWidth = width / monthNum,
gridMargin = { top: 3, right: 2, bottom: 3, left: 2 },
legendSize = { height: 20, width: 300};

// append the svg object to the body of the page
var svg = d3.select("#svgcontainer")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "center")

// chart
var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")") // move
var grids
var grid_min_lines
var grid_max_lines

// title
var title = svg.append("text")
    .attr("x", (width + margin.left + margin.right) / 2)             
    .attr("y", (margin.top - 30))
    .attr("text-anchor", "middle")  
    .style("font-size", "16px")
    .text("Monthly Min Temperature of HK")
    
// create a tooltip
var tooltip = d3.select("#svgcontainer")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "1")
    .text("tooltip text")

// Functions to change tooltip and fill
var mouseover_max = function(_, d) {
    tooltip
        .style("opacity", 0.8)
        .text("Date: " + d.year + "-" + d.month + " Max: " + d.avg_max.toFixed(1))
    d3.select(this)
        .style("stroke", "gray")
        .style("opacity", 1)
}
var mouseover_min = function(_, d) {
    tooltip
        .style("opacity", 0.8)
        .text("Date: " + d.year + "-" + d.month + " Max: " + d.avg_min.toFixed(1))
    d3.select(this)
        .style("stroke", "gray")
        .style("opacity", 1)
}
var mousemove = function(e) {
    tooltip
        .style("visibility", "visible")
        .style("left", ("left",(e.pageX+12)+"px"))
        .style("top", ("top", (e.pageY-12)+"px"))
}
var mouseleave = function() {
    tooltip
        .style("opacity", 0)
    d3.select(this)
        .style("stroke", "none")
        .style("opacity", 0.8)
}

var color = d3.scaleSequential(d3.interpolateRdBu)
var showMax = function () {
    title.text("Monthly Max Temperature of HK")
    grids
    .on("mouseover", mouseover_max)
    .transition().attr("fill", d => color(d.avg_max))
}
var showMin = function() {
    title.text("Monthly Min Temperature of HK")
    grids
        .on("mouseover", mouseover_min)
        .transition().attr("fill", d => color(d.avg_min))
}

// csv data
d3.csv("../temperature_daily.csv").then(function(data) {
    // Data preprocess
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    // define time parser
    var time_parse = d3.timeParse("%Y-%m-%d")
    var formatTime = d3.timeFormat("%Y-%m")
    var max_temp = -999
    var min_temp = 999
    data.forEach(d => {
        var date = time_parse(d.date)
        d.year_month = formatTime(date)
        d.year = date.getFullYear()
        d.month = months[date.getMonth()]
        d.day = date.getDate()
        // find max/min value over all data
        if (parseInt(d.max_temperature) > max_temp){
            max_temp = parseInt(d.max_temperature)
        }
        if (parseInt(d.min_temperature) < min_temp){
            min_temp = parseInt(d.min_temperature)
        }
    })

    // Calculate montholy average data
    var ave_data = Array.from(d3.group(data, d => d.year_month)).map(d => d[1])
    var ave_data = d3.rollups(ave_data, v => v.year_month,
        d => { return {"month": d[0].month, "year": d[0].year, "avg_min": d3.sum(d, d => d.min_temperature) / d.length, "avg_max": d3.sum(d, d => d.max_temperature) / d.length}}).map(d => d[0])
    // Calculate daily data for each month
    var month_data = Array.from(d3.group(data, d => d.year_month)).map(d => d[1])

    // Build X and Y scales and axis
    var yRange = d3.extent(data.map(e => e.year))
    var yScale = d3.scaleLinear()
        .domain(yRange)
        .range([gridHeight/2, height - gridHeight/2]);
    g.append("g")
        .call(d3.axisLeft(yScale).ticks(yRange[1] - yRange[0] + 1, d3.format("d")))
    var xScale = d3.scalePoint()
        .domain(months)
        .range([gridWidth/2, width - gridWidth/2])
    g.append("g")
        .call(d3.axisTop(xScale))

    // Build color scale
    var defs = svg.append("defs")
    defs.append("linearGradient")
        .attr("id", "linear-gradient")
        .selectAll("stop")
        .data(color.ticks().reverse().map((t, i, n) => ({ offset: i/n.length, color: color(t) })))
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color)
    var minTemp = d3.min(ave_data.map(e => e.avg_min))
    var maxTemp = d3.max(ave_data.map(e => e.avg_max))
    color.domain([maxTemp, minTemp]);

    // add legend
    var legendscale = d3.scaleLinear()
        .domain([Math.floor(minTemp), Math.floor(maxTemp)+1])
        .range([0, legendSize.width])
    var legend = g.append('g')
        .attr("transform", "translate(" + (width / 2 - legendSize.width / 2) + "," + (height + 10 + legendSize.height) + ")")
        .call(d3.axisTop(legendscale).ticks(10, d3.format("d")))
    legend.append("rect")
        .attr("width", legendSize.width)
        .attr("height", legendSize.height)
        .style("fill", "url(#linear-gradient)")

    // add grids
    grids = g.selectAll()
        .data(ave_data)
        .enter()
        .append("rect")
            .attr("y", d => yScale(d.year) - gridHeight / 2 + gridMargin.top)
            .attr("x", d => xScale(d.month) - gridWidth / 2 + gridMargin.left)
            .attr("width", gridWidth - gridMargin.left - gridMargin.right)
            .attr("height", gridHeight - gridMargin.top - gridMargin.bottom)
            .attr("fill", d => color(d.avg_min))
            .attr("rx", 3)
            .attr("ry", 3)
            .style("stroke-width", 4)
            .style("stroke", "none")
            .style("opacity", 0.8)
        .on("mouseover", mouseover_min)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)

    // define scales for line chart in each grid
    var line_x_scale = d3.scalePoint()
        .domain(d3.range(1, 32))
        .range([1, gridWidth-6]) // -6 due to grid margin
    var line_y_scale = d3.scaleLinear()
        .domain([max_temp, min_temp])
        .range([2, gridHeight-8])

    // build daily lines 
    var min_temp_line = d3.line()
        .x(function(d){ return line_x_scale(d.day); })
        .y(function(d){ return line_y_scale(d.min_temperature); });
    var max_temp_line = d3.line()
        .x(function(d){ return line_x_scale(d.day); })
        .y(function(d){ return line_y_scale(d.max_temperature); });    

    // add daily lines
    grid_min_lines = g.selectAll("grids")
        .data(month_data)
        .enter()   
        .append('path')
        .attr('class', 'line')
        .attr('d', min_temp_line)
        .attr("stroke", "rgba(60, 100, 180, 0.8)")
        .attr("stroke-width", 1)
        .attr("fill", "transparent")
        .attr('transform', function(d){ 
            return "translate(" + (xScale(d[0].month) - gridWidth / 2 + gridMargin.left) + "," + 
            (yScale(d[0].year) - gridHeight / 2 + gridMargin.top) + ")" })

    grid_max_lines = g.selectAll("grids")
        .data(month_data)
        .enter()   
        .append('path')
        .attr('class', 'line')
        .attr('d', max_temp_line)
        .attr("stroke", "rgba(200, 0, 30, 0.8)")
        .attr("stroke-width", 1)
        .attr("fill", "transparent")
        .attr('transform', function(d){ 
            return "translate(" + (xScale(d[0].month) - gridWidth / 2 + gridMargin.left) + "," + 
            (yScale(d[0].year) - gridHeight / 2 + gridMargin.top) + ")" })
    
    if (!draw_line){
        grid_min_lines.attr("stroke", "rgba(60, 100, 180, 0)")
        grid_max_lines.attr("stroke", "rgba(200, 0, 30, 0)")
    }
})