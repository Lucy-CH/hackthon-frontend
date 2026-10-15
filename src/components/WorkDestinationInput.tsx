import { useId, useState } from 'react'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { useAddressSearch } from '@/hooks/useAddressSearch'
import type { Address } from '@/types/address'

interface WorkDestinationInputProps {
  onSelect: (address: Address | null) => void
}

function getAddressLabel(address: Address): string {
  return address.address_zh || address.address_en
}

export default function WorkDestinationInput({
  onSelect,
}: WorkDestinationInputProps) {
  const inputId = useId()

  const [inputValue, setInputValue] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [isComposing, setIsComposing] = useState(false)

  const { items, isLoading, error } = useAddressSearch(
    inputValue,
    !isComposing && selectedAddress === null,
  )

  // Keep the selected address available after searching is disabled.
  const options = selectedAddress ? [selectedAddress] : items

  let emptyMessage = 'No addresses found.'

  if (isComposing) {
    emptyMessage = 'Finish typing to search.'
  } else if (!inputValue.trim()) {
    emptyMessage = 'Type an address or building name.'
  } else if (isLoading) {
    emptyMessage = 'Searching addresses...'
  } else if (error) {
    emptyMessage = 'Unable to search addresses. Please try again.'
  }

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="text-sm font-medium">
        Work destination
      </label>

      <Combobox<Address>
        items={options}
        value={selectedAddress}
        inputValue={inputValue}
        filter={null}
        itemToStringLabel={getAddressLabel}
        isItemEqualToValue={(item, value) => item.id === value.id}
        onInputValueChange={(value, details) => {
          setInputValue(value)

          if (
            details.reason === 'input-change' ||
            details.reason === 'input-clear' ||
            details.reason === 'clear-press'
          ) {
            setSelectedAddress(null)
            onSelect(null)
          }
        }}
        onValueChange={(address) => {
          setSelectedAddress(address)
          setInputValue(address ? getAddressLabel(address) : '')
          onSelect(address)
        }}
      >
        <ComboboxInput
          id={inputId}
          className="w-full"
          placeholder="Search an address or building..."
          showClear
          showTrigger={false}
          maxLength={100}
          aria-busy={isLoading}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(event) => {
            setInputValue(event.currentTarget.value)
            setIsComposing(false)
          }}
        />

        <ComboboxContent>
          <ComboboxEmpty>
            <span role="status">{emptyMessage}</span>
          </ComboboxEmpty>

          <ComboboxList>
            {(address: Address) => (
              <ComboboxItem key={address.id} value={address}>
                <div className="min-w-0 py-1">
                  <p className="font-medium">
                    {address.building_name_zh ||
                      address.building_name_en ||
                      getAddressLabel(address)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {address.address_zh}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {address.address_en}
                  </p>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
