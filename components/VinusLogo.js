import React from 'react';
import { View, StyleSheet } from 'react-native';

const VinusLogo = ({ size = 132 }) => {
  const circleSize = size;
  const innerSize = size * 0.84;

  return (
    <View style={[styles.wrapper, { width: circleSize, height: circleSize }]}> 
      <View style={[styles.outerCircle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
        <View style={[styles.innerCircle, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
          <View style={styles.roadContainer}>
            <View style={styles.road}>
              <View style={styles.laneLeft} />
              <View style={styles.laneRight} />
            </View>
          </View>
          <View style={styles.arc} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  outerCircle: {
    backgroundColor: '#d9d9d9',
    borderWidth: 4,
    borderColor: '#9d9d9d',
    alignItems: 'center',
    justifyContent: 'center'
  },
  innerCircle: {
    backgroundColor: '#f4f4f4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  roadContainer: {
    width: '62%',
    height: '58%',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  road: {
    width: 0,
    height: 0,
    borderLeftWidth: 24,
    borderRightWidth: 24,
    borderBottomWidth: 68,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#275493',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  laneLeft: {
    position: 'absolute',
    bottom: 10,
    left: -5,
    width: 3,
    height: 28,
    backgroundColor: '#f4f4f4',
    transform: [{ rotate: '-18deg' }]
  },
  laneRight: {
    position: 'absolute',
    bottom: 10,
    right: -5,
    width: 3,
    height: 28,
    backgroundColor: '#f4f4f4',
    transform: [{ rotate: '18deg' }]
  },
  arc: {
    position: 'absolute',
    top: '18%',
    width: '68%',
    height: '34%',
    borderTopWidth: 10,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderColor: '#275493',
    borderBottomWidth: 0,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120
  }
});

export default VinusLogo;
