

import LiquidSwipe from '@/app/components/LiquidSwipe/LiquidSwipe'
import Onboarding from '@/app/components/Onboarding'
import { View, Text } from 'react-native'



export default function index() {
  return (
    <View className='flex-1'>
     {/* <Onboarding /> */}
     <LiquidSwipe/>
    </View>
  )
}