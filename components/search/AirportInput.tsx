import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList,
} from 'react-native';
import { suggestPlaces } from '@/lib/duffel';
import { AirportOption } from '@/store/search.store';
import { colors, fontSize, spacing } from '@/constants/design';

interface Props {
  label:       string;
  value:       AirportOption | null;
  onChange:    (place: AirportOption) => void;
  placeholder?: string;
}

export function AirportInput({ label, value, onChange, placeholder = 'City or airport' }: Props) {
  const [query,   setQuery]   = useState('');
  const [focused, setFocused] = useState(false);

  const results      = suggestPlaces(query);
  const showDropdown = focused && results.length > 0;

  const handleQueryChange = (text: string) => setQuery(text);

  const handleSelect = (place: AirportOption) => {
    onChange(place);
    setQuery('');
    setFocused(false);
  };

  const displayValue = value ? `${value.iata} — ${value.city}` : '';

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 4 }}>
        {label}
      </Text>
      <View style={{
        borderWidth: 1.5,
        borderColor: focused ? colors.accent : colors.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.background,
      }}>
        {!focused && value ? (
          <TouchableOpacity onPress={() => setFocused(true)}>
            <Text style={{ fontSize: fontSize.body, color: colors.text, fontWeight: '600' }}>
              {value.iata}
            </Text>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
              {value.city} — {value.name}
            </Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            autoFocus={focused && !value}
            value={focused ? query : displayValue}
            onChangeText={handleQueryChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={{ fontSize: fontSize.body, color: colors.text, padding: 0 }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        )}
      </View>

      {showDropdown && (
        <View style={{
          position:      'absolute',
          top:           '100%',
          left:          0,
          right:         0,
          zIndex:        100,
          backgroundColor: colors.background,
          borderWidth:   1,
          borderColor:   colors.border,
          borderRadius:  10,
          marginTop:     4,
          shadowColor:   '#000',
          shadowOpacity: 0.1,
          shadowRadius:  8,
          shadowOffset:  { width: 0, height: 4 },
          elevation:     4,
        }}>
          {(
            <FlatList
              data={results}
              keyExtractor={(item) => item.iata}
              keyboardShouldPersistTaps="always"
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical:   12,
                    borderBottomWidth: index < results.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: fontSize.body, color: colors.text, fontWeight: '600' }}>
                    {item.iata}
                  </Text>
                  <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                    {item.city} — {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

      )}
    </View>
  );
}
