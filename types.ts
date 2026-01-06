
export type MealSlot = 'BREAKFAST' | '10AM SNACK' | 'LUNCH' | '4PM SNACK' | 'SUPPER' | 'OTHER';
export type GoalType = 'lose' | 'maintain' | 'gain' | 'bulk';
export type EnvironmentType = 'gym' | 'home' | 'outdoor';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: number;
  slot?: MealSlot;
  isFavorite?: boolean;
  isPlanned?: boolean;
  bulkingNote?: string;
}

export interface ActivityRecord {
  id: string;
  type: 'run' | 'walk' | 'steps';
  distance: number; // in meters
  duration: number; // in seconds
  caloriesBurned: number;
  timestamp: number;
  steps?: number;
  path?: { lat: number, lng: number }[];
  avgPace?: string;
  elevationGain?: number;
}

export interface WaterLog {
  amount: number; // in ml
  timestamp: number;
}

export interface WeightEntry {
  weight: number;
  timestamp: number;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  completed: boolean;
  restTime?: number; // Duration in seconds
}

export interface WorkoutSession {
  id: string;
  title: string;
  exercises: WorkoutExercise[];
  date: string;
  timestamp: number;
  totalVolume?: number; // (Weight * Reps * Sets)
  environment?: EnvironmentType;
}

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  type: 'meal' | 'workout' | 'sleep' | 'other';
}

export interface UserProfile {
  displayName: string;
  weight: number;
  height: number;
  age: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'extra';
  dailyCalorieGoal: number;
  proteinGoal: number;
  goalType?: GoalType;
  waterGoal?: number; // in ml
  stepGoal?: number;
  availableEquipment?: string[];
  preferredGym?: string;
}
