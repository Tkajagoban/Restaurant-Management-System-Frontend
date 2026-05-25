export type FoodVariation = {
  id: string;
  name: string;
  price: number;
  image?: string;
};

export type SubCategory = {
  id: string;
  name: string;
  image?: string;
  variations: FoodVariation[];
};

export type FoodCategory = {
  id: string;
  name: string;
  image?: string;
  subCategories: SubCategory[];
  flag?: string;
};

// Image URLs - Using placeholder food images
const imageUrls = {
  // Food variants
  'chicken-kottu': 'https://dosanchutney.ca/Chicken%20Kothu.JPG',
  'egg-kottu': 'https://dosanchutney.ca/Chicken%20Kothu.JPG',
  'vegetable-kottu': 'https://dosanchutney.ca/Chicken%20Kothu.JPG',
  'mutton-kottu': 'https://dosanchutney.ca/Chicken%20Kothu.JPG',
  'chicken-rice': 'https://thumbs.dreamstime.com/b/curry-vegetarian-food-arranged-dinner-sri-lanka-top-view-rice-150309000.jpg',
  'fish-rice': 'https://thumbs.dreamstime.com/b/curry-vegetarian-food-arranged-dinner-sri-lanka-top-view-rice-150309000.jpg',
  'vegetable-rice': 'https://thumbs.dreamstime.com/b/curry-vegetarian-food-arranged-dinner-sri-lanka-top-view-rice-150309000.jpg',
  'plain-hoppers': 'https://14179767.cdn6.editmysite.com/uploads/1/4/1/7/14179767/KF23X4SBYITGE76ASG4LOKKV.jpeg',
  'egg-hoppers': 'https://14179767.cdn6.editmysite.com/uploads/1/4/1/7/14179767/KF23X4SBYITGE76ASG4LOKKV.jpeg',
  'chicken-biryani': 'https://barbequeen.com/public/images/blogs/blog-chicken-briyani.jpg',
  'mutton-biryani': 'https://barbequeen.com/public/images/blogs/blog-chicken-briyani.jpg',
  'vegetable-biryani': 'https://barbequeen.com/public/images/blogs/blog-chicken-briyani.jpg',
  'masala-dosa': 'https://myfoodstory.com/wp-content/uploads/2025/08/Dosa-Recipe-2.jpg',
  'plain-dosa': 'https://myfoodstory.com/wp-content/uploads/2025/08/Dosa-Recipe-2.jpg',
  'butter-chicken': 'https://ichef.bbci.co.uk/food/ic/food_16x9_1600/recipes/chicken_curry_61994_16x9.jpg',
  'paneer-tikka': 'https://ichef.bbci.co.uk/food/ic/food_16x9_1600/recipes/chicken_curry_61994_16x9.jpg',
  'chicken-fried-rice': 'https://images.getrecipekit.com/20220904015448-veg-20fried-20rice.png?aspect_ratio=16:9&quality=90&',
  'egg-fried-rice': 'https://images.getrecipekit.com/20220904015448-veg-20fried-20rice.png?aspect_ratio=16:9&quality=90&',
  'chicken-noodles': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvQHEclVJWuFYQZXzcTq9TxmmSYxrckoyTnQ&s',
  'vegetable-noodles': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvQHEclVJWuFYQZXzcTq9TxmmSYxrckoyTnQ&s',
  'chicken-shawarma': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSef4P3ET-UANIbvw22MFhLVLj9wcbSIyleVQ&s',
  'beef-shawarma': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSef4P3ET-UANIbvw22MFhLVLj9wcbSIyleVQ&s',
  'margherita': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  'pepperoni': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  // New countries
  'japanese': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
  'mexican': 'https://images.unsplash.com/photo-1565299585323-38174c4a6a0a?w=400&h=300&fit=crop',
  // Japanese sub-categories
  'sushi': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
  'ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  // Japanese food variants
  'salmon-sushi': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
  'tuna-sushi': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
  'chicken-ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  'beef-ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  // Italian sub-categories (additional)
  'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
  // Italian food variants (additional)
  'alfredo-pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
  'carbonara-pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
  // Mexican sub-categories
  'tacos': 'https://images.unsplash.com/photo-1565299585323-38174c4a6a0a?w=400&h=300&fit=crop',
  'burritos': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop',
  // Mexican food variants
  'chicken-taco': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm2bKzFL-W2y6T9UnkRO2ckwIJEOpmhEMlFA&s',
  'beef-taco': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm2bKzFL-W2y6T9UnkRO2ckwIJEOpmhEMlFA&s',
  'beef-burrito': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop',
  'chicken-burrito': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop',
};

export const foodData: FoodCategory[] = [
  {
    id: 'sri-lankan',
    name: 'Sri Lankan Food',
    // image: imageUrls['sri-lankan'],
    subCategories: [
      {
        id: 'kottu',
        name: 'Kottu',
        // image: imageUrls['kottu'],
        variations: [
          { id: 'chicken-kottu', name: 'Chicken Kottu', price: 450, image: imageUrls['chicken-kottu'] },
          { id: 'egg-kottu', name: 'Egg Kottu', price: 350, image: imageUrls['egg-kottu'] },
          { id: 'vegetable-kottu', name: 'Vegetable Kottu', price: 300, image: imageUrls['vegetable-kottu'] },
          { id: 'mutton-kottu', name: 'Mutton Kottu', price: 550, image: imageUrls['mutton-kottu'] },
        ],
      },
      {
        id: 'rice-curry',
        name: 'Rice & Curry',
        // image: imageUrls['rice-curry'],
        variations: [
          { id: 'chicken-rice', name: 'Chicken Rice & Curry', price: 400, image: imageUrls['chicken-rice'] },
          { id: 'fish-rice', name: 'Fish Rice & Curry', price: 450, image: imageUrls['fish-rice'] },
          { id: 'vegetable-rice', name: 'Vegetable Rice & Curry', price: 350, image: imageUrls['vegetable-rice'] },
        ],
      },
      {
        id: 'hoppers',
        name: 'String Hoppers',
        // image: imageUrls['hoppers'],
        variations: [
          { id: 'plain-hoppers', name: 'Plain String Hoppers', price: 200, image: imageUrls['plain-hoppers'] },
          { id: 'egg-hoppers', name: 'Egg String Hoppers', price: 250, image: imageUrls['egg-hoppers'] },
        ],
      },
    ],
  },
  {
    id: 'indian',
    name: 'Indian Food',
    // image: imageUrls['indian'],
    subCategories: [
      {
        id: 'biryani',
        name: 'Biryani',
        // image: imageUrls['biryani'],
        variations: [
          { id: 'chicken-biryani', name: 'Chicken Biryani', price: 500, image: imageUrls['chicken-biryani'] },
          { id: 'mutton-biryani', name: 'Mutton Biryani', price: 600, image: imageUrls['mutton-biryani'] },
          { id: 'vegetable-biryani', name: 'Vegetable Biryani', price: 400, image: imageUrls['vegetable-biryani'] },
        ],
      },
      {
        id: 'dosa',
        name: 'Dosa',
        // image: imageUrls['dosa'],
        variations: [
          { id: 'masala-dosa', name: 'Masala Dosa', price: 250, image: imageUrls['masala-dosa'] },
          { id: 'plain-dosa', name: 'Plain Dosa', price: 150, image: imageUrls['plain-dosa'] },
        ],
      },
      {
        id: 'curry',
        name: 'Curry',
        // image: imageUrls['curry'],
        variations: [
          { id: 'butter-chicken', name: 'Butter Chicken', price: 450, image: imageUrls['butter-chicken'] },
          { id: 'paneer-tikka', name: 'Paneer Tikka', price: 400, image: imageUrls['paneer-tikka'] },
        ],
      },
    ],
  },
  {
    id: 'chinese',
    name: 'Chinese Food',
    // image: imageUrls['chinese'],
    subCategories: [
      {
        id: 'fried-rice',
        name: 'Fried Rice',
        // image: imageUrls['fried-rice'],
        variations: [
          { id: 'chicken-fried-rice', name: 'Chicken Fried Rice', price: 450, image: imageUrls['chicken-fried-rice'] },
          { id: 'egg-fried-rice', name: 'Egg Fried Rice', price: 350, image: imageUrls['egg-fried-rice'] },
        ],
      },
      {
        id: 'noodles',
        name: 'Noodles',
        // image: imageUrls['noodles'],
        variations: [
          { id: 'chicken-noodles', name: 'Chicken Noodles', price: 400, image: imageUrls['chicken-noodles'] },
          { id: 'vegetable-noodles', name: 'Vegetable Noodles', price: 350, image: imageUrls['vegetable-noodles'] },
        ],
      },
    ],
  },
  {
    id: 'arabian',
    name: 'Arabian Food',
    // image: imageUrls['arabian'],
    subCategories: [
      {
        id: 'shawarma',
        name: 'Shawarma',
        // image: imageUrls['shawarma'],
        variations: [
          { id: 'chicken-shawarma', name: 'Chicken Shawarma', price: 400, image: imageUrls['chicken-shawarma'] },
          { id: 'beef-shawarma', name: 'Beef Shawarma', price: 450, image: imageUrls['beef-shawarma'] },
        ],
      },
    ],
  },
  {
    id: 'italian',
    name: 'Italian Food',
    // image: imageUrls['italian'],
    subCategories: [
      {
        id: 'pizza',
        name: 'Pizza',
        // image: imageUrls['pizza'],
        variations: [
          { id: 'margherita', name: 'Margherita Pizza', price: 600, image: imageUrls['margherita'] },
          { id: 'pepperoni', name: 'Pepperoni Pizza', price: 750, image: imageUrls['pepperoni'] },
        ],
      },
      {
        id: 'pasta',
        name: 'Pasta',
        image: imageUrls['pasta'],
        variations: [
          { id: 'alfredo-pasta', name: 'Alfredo Pasta', price: 550, image: imageUrls['alfredo-pasta'] },
          { id: 'carbonara-pasta', name: 'Carbonara Pasta', price: 600, image: imageUrls['carbonara-pasta'] },
        ],
      },
    ],
  },
  {
    id: 'japanese',
    name: 'Japanese Food',
    image: imageUrls['japanese'],
    subCategories: [
      {
        id: 'sushi',
        name: 'Sushi',
        image: imageUrls['sushi'],
        variations: [
          { id: 'salmon-sushi', name: 'Salmon Sushi', price: 800, image: imageUrls['salmon-sushi'] },
          { id: 'tuna-sushi', name: 'Tuna Sushi', price: 750, image: imageUrls['tuna-sushi'] },
        ],
      },
      {
        id: 'ramen',
        name: 'Ramen',
        image: imageUrls['ramen'],
        variations: [
          { id: 'chicken-ramen', name: 'Chicken Ramen', price: 650, image: imageUrls['chicken-ramen'] },
          { id: 'beef-ramen', name: 'Beef Ramen', price: 700, image: imageUrls['beef-ramen'] },
        ],
      },
    ],
  },
  {
    id: 'mexican',
    name: 'Mexican Food',
    image: imageUrls['mexican'],
    subCategories: [
      {
        id: 'tacos',
        name: 'Tacos',
        image: imageUrls['tacos'],
        variations: [
          { id: 'chicken-taco', name: 'Chicken Taco', price: 450, image: imageUrls['chicken-taco'] },
          { id: 'beef-taco', name: 'Beef Taco', price: 500, image: imageUrls['beef-taco'] },
        ],
      },
      {
        id: 'burritos',
        name: 'Burritos',
        image: imageUrls['burritos'],
        variations: [
          { id: 'beef-burrito', name: 'Beef Burrito', price: 550, image: imageUrls['beef-burrito'] },
          { id: 'chicken-burrito', name: 'Chicken Burrito', price: 500, image: imageUrls['chicken-burrito'] },
        ],
      },
    ],
  },
];

