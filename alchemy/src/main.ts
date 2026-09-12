import './style.css';
import { Game } from './core/Game';

const root=document.querySelector<HTMLElement>('#alchemy-game');
if(!root)throw new Error('Moonroot Apothecary mount point missing');
new Game(root);
