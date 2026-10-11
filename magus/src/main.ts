import Phaser from 'phaser';
import { WorldScene } from './world/scene';
import './ui/style.css';
new Phaser.Game({type:Phaser.CANVAS,parent:'game',backgroundColor:'#263e2b',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},scene:[WorldScene],render:{powerPreference:'low-power'},audio:{noAudio:true}});
