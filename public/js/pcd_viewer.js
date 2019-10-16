import * as THREE from './lib/three.module.js';
import { PCDLoader } from './lib/PCDLoader.js';
import { OrbitControls } from './lib/OrbitControls.js';

var container;
var camera, controls, scene, renderer;
var camera;


var url_string = window.location.href
var url = new URL(url_string);
//language
var pcd_file = url.searchParams.get("file");


init();
animate();
function init() {
    document.body.addEventListener('keydown', event => {
        if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
          event.preventDefault()
        }
    })


    scene = new THREE.Scene();



    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );


       
    camera = new THREE.PerspectiveCamera( 65, window.innerWidth / window.innerHeight, 1, 800 );
    camera.position.x = 0;
    camera.position.z = 50;
    camera.position.y = 0;
    camera.up.set( 0, 0, 1);
    camera.lookAt( 0, 0, 0 );

    
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
    
    container = document.createElement( 'container' );
    

    document.body.appendChild( container );
    container.appendChild( renderer.domElement );

    document.addEventListener("keydown", keydown)

    scene.add( new THREE.AxesHelper( 2 ) );

    onWindowResize();
    window.addEventListener( 'resize', onWindowResize, false );
    
    load_all();
    
    render();
    
}

function load_all(){
    load_pcd("pcd", pcd_file, 0xff0000);    
}


function keydown( ev ) {
    
    switch ( ev.key) {
    case '+':
        clouds["src"].material.size *= 1.2;
        clouds["tgt"].material.size *= 1.2;
        clouds["out"].material.size *= 1.2;
        break;
    case '-':
        clouds["src"].material.size /= 1.2;
        clouds["tgt"].material.size /= 1.2;
        clouds["out"].material.size /= 1.2;
            
        break;
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );    
}
function animate() {
    requestAnimationFrame( animate );
    controls.update();   
    render();
    
}


function render(){
    renderer.render( scene, camera );
}


function load_pcd(name, file, overall_color){
    var loader = new PCDLoader();

    loader.load( file, 
        function ( pcd ) {
            var position = pcd.position;
            var color = pcd.color;
            var normal = pcd.normal;
            // build geometry
            var geometry = new THREE.BufferGeometry();
            if ( position.length > 0 ) geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
            if ( normal.length > 0 ) geometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( normal, 3 ) );
            if ( color.length > 0 ) geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( color, 3 ) );

            geometry.computeBoundingSphere();
            // build material

            var material = new THREE.PointsMaterial( { size: 0.005 } );

            if ( color.length > 0 ) {
                material.vertexColors = VertexColors;
            } else {
                material.color.setHex(overall_color );
            }

            //material.size = 0.1;

            // build mesh

            var mesh = new THREE.Points( geometry, material );                        
            mesh.name = "pcd";

            //return mesh;
            
            scene.add(mesh);

            
            //var center = points.geometry.boundingSphere.center;
            //controls.target.set( center.x, center.y, center.z );
            //controls.update();
        },
    );

}


