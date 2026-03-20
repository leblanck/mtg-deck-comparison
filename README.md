# mtg-deck-comparison
Tool Used for Finding Cards Across Multiple Decks

[![Netlify Status](https://api.netlify.com/api/v1/badges/b6ac84ae-2284-4376-a202-f34cddc0748d/deploy-status)](https://app.netlify.com/projects/mtg-deck-comparison/deploys)


## About MTG Deck Finder

MTG Deck Finder is a free tool that helps Magic: The Gathering players identify cards that appear across multiple decks. Simply paste in two or more decklists, and the app will highlight every card that shows up in more than one deck — along with the current market price sourced from Scryfall.

### How to use it

- Paste each decklist into its own text box on the Home page.
- Give each deck a name.
- Click Find Duplicates & Prices.
- Review the results table — sortable by card name, number of decks, or price.


### Decklist format

The app expects one card per line in the format `1 Card Name`. Basic lands and SIDEBOARD sections are automatically ignored. I typically copy my decklists via export from Moxfield.

### Pricing

Prices are fetched in real time from the Scryfall API and reflect the TCGPlayer market price for non-foil, near mint copies.