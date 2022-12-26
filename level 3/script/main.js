// layout
var margin = {top:100, right:20, bottom:50, left:20},
    total_width = 600,
    total_height = 800,
    width = total_width - margin.left - margin.right,
    height = total_height - margin.top - margin.bottom,
    grid_size = 5,
    r = {min:3, max:10};

var index_list = []
let grid, edge

var mat_max = 0
var mat_min = 0
var mat

// define tooltips and functions for details on demand
let tooltip_graph = d3.select("#node_chart")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "snow")
    .style("font-size", "12px")
    .text("a simple tooltip")

let tooltip_matrix = d3.select("#matrix_chart")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "snow")
    .style("font-size", "12px")
    .text("a simple tooltip")

let mouseover_graph = function(_, d){
    tooltip_graph.text(d.fullname)
    .style("visibility","visible")

    grid.style("stroke", function(v){
        if (v.x_value == d.m_index || v.y_value == d.m_index)
            return "rgba(32, 33, 37, 0.3)"
        else
            return "transparent"
    })
}

let mousemove_graph = function(e){
    tooltip_graph
    .style("top", (e.pageY - 10) + "px")
    .style("left",(e.pageX + 10) + "px")
}
let mouseleave_graph = function(){
    tooltip_graph.style("visibility", "hidden")
    grid.style("stroke", "transparent")
}

let mouseover_matrix = function(_, d){
    tooltip_matrix.text(d.number)
    .style("visibility", "visible")

    edge.style("stroke-width", function(v){
        if ((d.x_value == v.source.m_index && d.y_value == v.source.m_index) || 
            (d.y_value == v.source.m_index && d.x_value == v.target.m_index))
        return "6px"
    })
    edge.style("stroke", function(v){
        if ((d.x_value == v.source.m_index && d.y_value == v.source.m_index) || 
            (d.y_value == v.source.m_index && d.x_value == v.target.m_index))
        return "red"
    })
}

let mousemove_matrix = function(e){
    tooltip_matrix
    .style("top", (e.pageY - 10) + "px")
    .style("left",(e.pageX + 10) + "px")
}
let mouseleave_matrix = function(){
    tooltip_matrix.style("visibility", "hidden")
    edge.style("stroke-width", "1px")
}

// json data
d3.json("../HKUST_coauthor_graph.json").then(function(data){
    // filter according to dept
    // TODO: otpions to choose different dept
    var dept_nodes = data.nodes.filter(d => d.dept == "CSE")
    var dept_id = []
    for(var i = 0; i < dept_nodes.length; i++){
        dept_id.push(dept_nodes[i].id)
    }

    // filter dept's edges
    var dept_edges = data.edges.filter(d => dept_id.includes(d.source) && dept_id.includes(d.target))
    var dept_sources = []
    var dept_targets = []
    
    for(var i = 0; i < dept_edges.length; i++){
        dept_sources.push(dept_edges[i].source)
        dept_targets.push(dept_edges[i].target)
    }

    var dept_id_list = []
    for(var i = 0; i < dept_nodes.length; i++){
        dept_id_list.push(dept_nodes[i].id)
    }
    
    var reverse_dept_edges = dept_edges.map(function(d){
        return{
            source: d.target,
            target: d.source,
            publications: d.publications
        }
    })
    var total_edges = dept_edges.concat(reverse_dept_edges)

    // calculate the number of collaborators
    var counter = 0
    for(var i = 0; i < dept_nodes.length; i++){
        for(var j = 0; j < total_edges.length; j++){
            if(total_edges[j].source == dept_nodes[i].id){
                counter += 1
            }
        }
        dept_nodes[i].coNumber = counter
        counter = 0
    }

    //index the dept_nodes with its natural order
    for(var i = 0; i < dept_nodes.length; i++){
        dept_nodes[i].m_index = i
        index_list.push(i)
    }

    // calculate each grid
    mat = Array(dept_nodes.length).fill(null).map(() => Array(dept_nodes.length).fill(0))
    for(var j = 0; j < total_edges.length; j++){
        var s = dept_nodes.filter(function(d){return d.id == total_edges[j].source})
        var t = dept_nodes.filter(function(d){return d.id == total_edges[j].target})
        var m = s[0].m_index
        var n = t[0].m_index
        total_edges[j].s_index = m
        total_edges[j].t_index = n
        mat[m][n] = total_edges[j].publications.length
        if(mat[m][n] > mat_max){
            mat_max = mat[m][n]
        }
        if(mat[m][n] < mat_min){
            mat_min = mat[m][n]
        }
    }

    return{
        nodes: dept_nodes,
        edges: dept_edges,
        total_edges: total_edges
    }
}).then(function(data){ // construct graph
    // construct color and radii scale
    var c_scale = d3.scaleQuantile()
        .domain([d3.min(data.nodes, d => d.coNumber),d3.max(data.nodes, d => d.coNumber)])
        .range(d3.schemeTableau10);
    var r_scale = d3.scaleLinear()
        .domain([d3.min(data.nodes, d => d.coNumber),d3.max(data.nodes, d => d.coNumber)])
        .range([r.min, r.max]);

    // construct svg
    var svg_graph = d3.select("#node_chart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
    // construct the forces
    const simulation = d3.forceSimulation(data.nodes)
        .force("edges", d3.forceLink(data.edges).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-50).distanceMin(25).distanceMax(80))
        .force("center", d3.forceCenter(width / 4 + margin.left, height / 3))
        .on("tick", ticked)
    
    // edge
    edge = svg_graph.append("g")
        .selectAll("edge")
        .data(data.edges)
        .enter()
        .append("line")
        .attr("stroke", "gray")
        .attr("stroke-opacity", 0.7);

    // node
    const node = svg_graph.append("g")
        .selectAll("node")
        .data(data.nodes)
        .enter()
        .append("circle")
        .attr("r", d => r_scale(d.coNumber))
        .attr("fill", d => c_scale(d.coNumber))        
            .call(drag(simulation))
        .on("mouseover", mouseover_graph)
        .on("mousemove", mousemove_graph) 
        .on("mouseout", mouseleave_graph)

    function ticked() {
        edge
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
        node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    }

    function drag(simulation) {    
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
    
    return data;
}).then(function(data){ // construct matrix chart
    var svg_matrix = d3.select("#matrix_chart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + 2 * margin.left + "," + 2 * margin.top + ")");
    //
    var scale_x = d3.scalePoint().domain(index_list).range([grid_size, width - 200]);
    var scale_y = d3.scalePoint().domain(index_list).range([grid_size, width - 200]);

    // construct color scale
    var c_scale = d3.scaleSequential(d3.interpolateRdBu)
    var defs = svg_matrix.append("defs")
    defs.append("linearGradient")
        .attr("id", "linear-gradient")
        .selectAll("stop")
        .data(c_scale.ticks().reverse().map((t, i, n) => ({ offset: i/n.length, color: c_scale(t) })))
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color)
    c_scale.domain([Math.log1p(mat_max), mat_min]);

    var positions = [];
    for (var i = 0; i < index_list.length; i++){
        for (var j = 0; j < index_list.length; j++){
            positions.push({
                x_value:index_list[i],
                y_value:index_list[j],
                x: scale_x(index_list[i]) - grid_size / 2 + 100,
                y: scale_y(index_list[j]) - grid_size / 2,
                number: mat[i][j]
            });
        }
    }

    grid = svg_matrix.append("g")
        .selectAll("grids")
        .data(positions)
        .enter()
        .append('rect')
        .attr("x", function(d){ return d.x; })
        .attr("y", function(d){ return d.y; })
        .attr("rx", 1)
        .attr("ry", 1)
        .attr("width", grid_size)
        .attr("height", grid_size)
        .style("fill", function(d){
            if(d.number > 0){
                return c_scale(Math.log1p(d.number));
            }else{
                return "rgba(229, 229, 229, 0.8)";}                                     
            })
        .attr("z-index", "1")
        .on("mouseover", mouseover_matrix)
        .on("mousemove", mousemove_matrix)
        .on("mouseout", mouseleave_matrix)

    // ticks of matrix chart
    function label_text(d) {
        if (d.fullname.length != 0)
                return d.fullname;
            else
                return d.itsc
    }
    svg_matrix.append("g")
        .selectAll("text")
        .data(data.nodes)
        .enter()
        .append("text")
        .text(label_text)
        .attr("x", 0)
        .attr("y", function(d, i){ return scale_y(d.m_index) + grid_size / 2 + 100;})
        .style("font-size", "7px")
        .attr("transform", "rotate(-90)");
    svg_matrix.append("g")
        .selectAll("text")
        .data(data.nodes)
        .enter()
        .append("text")
        .text(label_text)
        .attr("x", 100)
        .attr("y", d => scale_y(d.m_index) + grid_size / 2)
        .style("text-anchor", "end")
        .style("font-size", "7px")

    // add legend
    var legend = svg_matrix.append('g')
        .attr("transform", "translate(" + (width-80) + "," + (100) + ")")
    legend.append("rect")
        .attr("width", 100)
        .attr("height", 10)
        .style("fill", "url(#linear-gradient)")
        .attr("transform", "rotate(-90)");
    
    svg_matrix.append("g").selectAll(".legend_text")
        .data([mat_max, mat_min])
        .enter().append("text")
        .text(d => d.toString())
        .attr("x", function(d, i){ return width + i * 3 - 81 })
        .attr("y", function(d, i){ return i * 115 - 5 })
        .style("fill", "black")
        .style("font-size", "10");  
})
