const STORAGE_KEY = 'dailyslop_cookbook_recipes_v1';

const defaultRecipes = [
  {
    name: 'Achiote "Al Pastor" Chicken Thighs',
    details: 'Chicken thighs marinated in achiote, citrus, garlic, vinegar, cumin, oregano.\nCooked hot (grill or oven) and served with caramelized pineapple.\nServe as tacos or bowls with rice, beans, cabbage, avocado.'
  },
  {
    name: 'Chorizo White Bean Kale Skillet',
    details: 'Chorizo, onion, garlic, mushrooms, kale, corn, white beans.\nFinished with lime.\nServe with tortillas.'
  },
  {
    name: 'Salmon Sheet Pan',
    details: 'Salmon roasted with vegetables (broccoli, carrots, potatoes).\nOlive oil, salt, pepper, lemon.'
  },
  {
    name: 'BBQ Chicken Sliders',
    details: 'Crockpot shredded chicken + BBQ sauce.\nServed with pickles, salad, potato wedges.'
  },
  {
    name: 'Tofu Stir Fry (Kenji-style)',
    details: 'Crispy tofu with vegetables and savory sauce.\nServe over rice.'
  },
  {
    name: 'Peruvian Chicken Bowl',
    details: 'Spiced chicken with rice, veggies, and aji verde sauce.'
  },
  {
    name: 'Grilled BBQ Chicken + Veg + Sweet Potato',
    details: 'Simple grilled chicken with roasted vegetables and sweet potato.'
  },
  {
    name: 'Fish Tacos',
    details: 'Seasoned fish, cabbage slaw, crema, tortillas.'
  },
  {
    name: 'Mediterranean (Cava-style) Bowl',
    details: 'Protein (chicken/lamb), rice, hummus, veggies, tzatziki.'
  },
  {
    name: 'Taco Bowls',
    details: 'Ground meat, rice, beans, lettuce, toppings.'
  },
  {
    name: 'Meat Tacos',
    details: 'Classic tacos with seasoned beef and toppings.'
  },
  {
    name: 'Chicken Shawarma',
    details: 'Spiced chicken with rice or pita, veggies, yogurt sauce.'
  },
  {
    name: 'Turkey Meatballs Pasta',
    details: 'Turkey meatballs with marinara over pasta.'
  },
  {
    name: 'Breakfast Bowls',
    details: 'Eggs, potatoes, protein, veggies.'
  },
  {
    name: 'Tuna Poke Bowl',
    details: 'Raw tuna, rice, cucumber, avocado, soy-based sauce.'
  },
  {
    name: 'Chili',
    details: 'Hearty chili with beans and ground meat.'
  },
  {
    name: 'Thai Coconut Curry',
    details: 'Coconut milk curry with vegetables and protein (chicken/shrimp/tofu).'
  },
  {
    name: 'Japanese Chicken Teriyaki Bowl',
    details: 'Teriyaki chicken, rice, broccoli, sesame.'
  },
  {
    name: 'Tandoori Chicken',
    details: 'Yogurt-spiced chicken, served with rice or naan and raita.'
  },
  {
    name: 'Vietnamese Lemongrass Pork Bowl',
    details: 'Lemongrass pork, rice/noodles, cucumber, herbs, nuoc cham.'
  },
  {
    name: 'Cuban Mojo Pork',
    details: 'Citrus-garlic marinated pork with rice, beans, avocado.'
  },
  {
    name: 'Caribbean Jerk Chicken',
    details: 'Spiced chicken with rice and beans, plantains.'
  }
];

let recipes = [];
let currentIndex = 0;

const recipeCard = document.getElementById('recipe-card');
const recipeList = document.getElementById('recipe-list');
const form = document.getElementById('add-recipe-form');
const nameInput = document.getElementById('recipe-name');
const detailsInput = document.getElementById('recipe-details');

function loadRecipes() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    recipes = [...defaultRecipes];
    saveRecipes();
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      recipes = [...defaultRecipes];
      saveRecipes();
      return;
    }

    recipes = parsed;
  } catch (error) {
    recipes = [...defaultRecipes];
    saveRecipes();
  }
}

function saveRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function renderCurrentRecipe() {
  if (!recipes.length) {
    recipeCard.innerHTML = '<p>No recipes yet. Add one below.</p>';
    return;
  }

  const recipe = recipes[currentIndex];
  recipeCard.innerHTML = `
    <h3 class="recipe-title">${escapeHtml(recipe.name)}</h3>
    <p class="meta">Recipe ${currentIndex + 1} of ${recipes.length}</p>
    <p class="recipe-notes">${escapeHtml(recipe.details)}</p>
  `;

  syncActiveListItem();
}

function renderList() {
  recipeList.innerHTML = '';

  recipes.forEach((recipe, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${recipe.name}`;
    li.dataset.index = String(index);

    li.addEventListener('click', () => {
      currentIndex = index;
      renderCurrentRecipe();
      li.scrollIntoView({ block: 'nearest' });
    });

    recipeList.appendChild(li);
  });

  syncActiveListItem();
}

function syncActiveListItem() {
  const items = recipeList.querySelectorAll('li');
  items.forEach((item) => {
    const itemIndex = Number(item.dataset.index);
    item.classList.toggle('active', itemIndex === currentIndex);
  });
}

function nextRecipe() {
  currentIndex = (currentIndex + 1) % recipes.length;
  renderCurrentRecipe();
}

function previousRecipe() {
  currentIndex = (currentIndex - 1 + recipes.length) % recipes.length;
  renderCurrentRecipe();
}

function randomRecipe() {
  if (!recipes.length) return;
  currentIndex = Math.floor(Math.random() * recipes.length);
  renderCurrentRecipe();
}

function addRecipe(name, details) {
  recipes.push({ name, details });
  saveRecipes();
  currentIndex = recipes.length - 1;
  renderList();
  renderCurrentRecipe();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

document.getElementById('next-recipe').addEventListener('click', nextRecipe);
document.getElementById('prev-recipe').addEventListener('click', previousRecipe);
document.getElementById('shuffle-recipe').addEventListener('click', randomRecipe);

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const details = detailsInput.value.trim();

  if (!name || !details) {
    return;
  }

  addRecipe(name, details);
  form.reset();
  nameInput.focus();
});

loadRecipes();
renderList();
renderCurrentRecipe();
