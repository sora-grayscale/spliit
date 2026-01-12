import {
  Armchair,
  Baby,
  Banknote,
  Bike,
  Bus,
  Car,
  CarTaxiFront,
  Cat,
  Clapperboard,
  CupSoda,
  Dices,
  Dumbbell,
  Eraser,
  FerrisWheel,
  Fuel,
  Gift,
  HandHelping,
  Home,
  Hotel,
  Lamp,
  Landmark,
  LibraryBig,
  LucideIcon,
  LucideProps,
  Martini,
  Music,
  ParkingMeter,
  Phone,
  PiggyBank,
  Plane,
  Plug,
  PlugZap,
  Shirt,
  ShoppingCart,
  Stethoscope,
  ThermometerSun,
  Train,
  Trash,
  Utensils,
  Wine,
  Wrench,
} from 'lucide-react'

// Static category mapping for E2EE (Issue #19)
// Since categoryId is now encrypted, we can't use the database relation
// This mapping matches the Category table seeded in migrations
const CATEGORY_MAP: Record<number, { grouping: string; name: string }> = {
  0: { grouping: 'Uncategorized', name: 'General' },
  1: { grouping: 'Uncategorized', name: 'Payment' },
  2: { grouping: 'Entertainment', name: 'Entertainment' },
  3: { grouping: 'Entertainment', name: 'Games' },
  4: { grouping: 'Entertainment', name: 'Movies' },
  5: { grouping: 'Entertainment', name: 'Music' },
  6: { grouping: 'Entertainment', name: 'Sports' },
  7: { grouping: 'Food and Drink', name: 'Food and Drink' },
  8: { grouping: 'Food and Drink', name: 'Dining Out' },
  9: { grouping: 'Food and Drink', name: 'Groceries' },
  10: { grouping: 'Food and Drink', name: 'Liquor' },
  11: { grouping: 'Home', name: 'Home' },
  12: { grouping: 'Home', name: 'Electronics' },
  13: { grouping: 'Home', name: 'Furniture' },
  14: { grouping: 'Home', name: 'Household Supplies' },
  15: { grouping: 'Home', name: 'Maintenance' },
  16: { grouping: 'Home', name: 'Mortgage' },
  17: { grouping: 'Home', name: 'Pets' },
  18: { grouping: 'Home', name: 'Rent' },
  19: { grouping: 'Home', name: 'Services' },
  20: { grouping: 'Life', name: 'Childcare' },
  21: { grouping: 'Life', name: 'Clothing' },
  22: { grouping: 'Life', name: 'Education' },
  23: { grouping: 'Life', name: 'Gifts' },
  24: { grouping: 'Life', name: 'Insurance' },
  25: { grouping: 'Life', name: 'Medical Expenses' },
  26: { grouping: 'Life', name: 'Taxes' },
  27: { grouping: 'Transportation', name: 'Transportation' },
  28: { grouping: 'Transportation', name: 'Bicycle' },
  29: { grouping: 'Transportation', name: 'Bus/Train' },
  30: { grouping: 'Transportation', name: 'Car' },
  31: { grouping: 'Transportation', name: 'Gas/Fuel' },
  32: { grouping: 'Transportation', name: 'Hotel' },
  33: { grouping: 'Transportation', name: 'Parking' },
  34: { grouping: 'Transportation', name: 'Plane' },
  35: { grouping: 'Transportation', name: 'Taxi' },
  36: { grouping: 'Utilities', name: 'Utilities' },
  37: { grouping: 'Utilities', name: 'Cleaning' },
  38: { grouping: 'Utilities', name: 'Electricity' },
  39: { grouping: 'Utilities', name: 'Heat/Gas' },
  40: { grouping: 'Utilities', name: 'Trash' },
  41: { grouping: 'Utilities', name: 'TV/Phone/Internet' },
  42: { grouping: 'Utilities', name: 'Water' },
}

// Helper to get category info from categoryId
export function getCategoryInfo(
  categoryId: number | string | undefined | null,
): {
  grouping: string
  name: string
} | null {
  if (categoryId === undefined || categoryId === null) return null
  const id =
    typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId
  // Handle NaN from invalid parseInt or invalid category IDs
  if (isNaN(id) || id < 0 || id > 42) return null
  return CATEGORY_MAP[id] ?? null
}

export function CategoryIcon({
  categoryId,
  ...props
}: { categoryId: number | string | undefined | null } & LucideProps) {
  const category = getCategoryInfo(categoryId)
  // If category is null/undefined or not found, use default icon
  const categoryKey = category
    ? `${category.grouping}/${category.name}`
    : 'Uncategorized/General'
  const Icon = getCategoryIcon(categoryKey)
  // eslint-disable-next-line react-hooks/static-components
  return <Icon {...props} />
}

function getCategoryIcon(category: string): LucideIcon {
  switch (category) {
    case 'Uncategorized/General':
      return Banknote
    case 'Uncategorized/Payment':
      return Banknote
    case 'Entertainment/Entertainment':
      return FerrisWheel
    case 'Entertainment/Games':
      return Dices
    case 'Entertainment/Movies':
      return Clapperboard
    case 'Entertainment/Music':
      return Music
    case 'Entertainment/Sports':
      return Dumbbell
    case 'Food and Drink/Food and Drink':
      return Utensils
    case 'Food and Drink/Dining Out':
      return Martini
    case 'Food and Drink/Groceries':
      return ShoppingCart
    case 'Food and Drink/Liquor':
      return Wine
    case 'Home/Home':
      return Home
    case 'Home/Electronics':
      return Plug
    case 'Home/Furniture':
      return Armchair
    case 'Home/Household Supplies':
      return Lamp
    case 'Home/Maintenance':
      return Wrench
    case 'Home/Mortgage':
      return Landmark
    case 'Home/Pets':
      return Cat
    case 'Home/Rent':
      return PiggyBank
    case 'Home/Services':
      return Wrench
    case 'Life/Childcare':
      return Baby
    case 'Life/Clothing':
      return Shirt
    case 'Life/Donation':
      return HandHelping
    case 'Life/Education':
      return LibraryBig
    case 'Life/Gifts':
      return Gift
    case 'Life/Insurance':
      return Landmark
    case 'Life/Medical Expenses':
      return Stethoscope
    case 'Life/Taxes':
      return Banknote
    case 'Transportation/Transportation':
      return Bus
    case 'Transportation/Bicycle':
      return Bike
    case 'Transportation/Bus/Train':
      return Train
    case 'Transportation/Car':
      return Car
    case 'Transportation/Gas/Fuel':
      return Fuel
    case 'Transportation/Hotel':
      return Hotel
    case 'Transportation/Parking':
      return ParkingMeter
    case 'Transportation/Plane':
      return Plane
    case 'Transportation/Taxi':
      return CarTaxiFront
    case 'Utilities/Utilities':
      return Banknote
    case 'Utilities/Cleaning':
      return Eraser
    case 'Utilities/Electricity':
      return PlugZap
    case 'Utilities/Heat/Gas':
      return ThermometerSun
    case 'Utilities/Trash':
      return Trash
    case 'Utilities/TV/Phone/Internet':
      return Phone
    case 'Utilities/Water':
      return CupSoda
    default:
      return Banknote
  }
}
