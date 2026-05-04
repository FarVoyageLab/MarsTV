import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

interface Props {
	onSearch: (query: string) => void;
	defaultValue?: string;
	placeholder?: string;
}

export function TVSearchInput({
	onSearch,
	defaultValue = "",
	placeholder = "搜索影视、番剧...",
}: Props) {
	const [value, setValue] = useState(defaultValue);
	const { scale, spacing } = useScreenDimensions();
	const theme = useTheme();
	const styles = useSearchStyles();

	const handleSubmit = () => {
		const q = value.trim();
		if (q.length > 0) {
			onSearch(q);
		}
	};

	return (
		<View style={styles.container}>
			<TextInput
				style={[
					styles.input,
					{
						color: theme.text,
						backgroundColor: theme.backgroundElement,
						borderColor: theme.tint + "60",
					},
				]}
				value={value}
				onChangeText={setValue}
				placeholder={placeholder}
				placeholderTextColor={theme.textSecondary}
				onSubmitEditing={handleSubmit}
				returnKeyType="search"
				autoFocus
				selectionColor={theme.tint}
			/>
			<Pressable
				onPress={handleSubmit}
				style={({ focused }) => [
					styles.button,
					{ backgroundColor: theme.tint },
					focused && { opacity: 0.8 },
				]}
			>
				<Text style={styles.buttonText}>搜索</Text>
			</Pressable>
		</View>
	);
}

const useSearchStyles = () => {
	const { scale, spacing } = useScreenDimensions();
	return StyleSheet.create({
		container: {
			flexDirection: "row",
			alignItems: "center",
			gap: spacing.two,
			marginHorizontal: spacing.two,
			marginVertical: spacing.three,
		},
		input: {
			flex: 1,
			height: 50 * scale,
			borderRadius: 12 * scale,
			paddingHorizontal: spacing.three,
			fontSize: 20 * scale,
			fontWeight: "500",
			borderWidth: 2 * scale,
		},
		button: {
			height: 50 * scale,
			paddingHorizontal: spacing.four,
			borderRadius: 12 * scale,
			justifyContent: "center",
			alignItems: "center",
		},
		buttonText: {
			color: "#ffffff",
			fontSize: 18 * scale,
			fontWeight: "700",
		},
	});
};
