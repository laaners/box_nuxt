import archetypesPics from "./data/archetypes.json"
import archetypesBlacklist from "./data/blacklist.json"
import { exceptionArc } from "./exceptionArc"

function groupBy(obj, key, listName) {
	const ris = []
	if (obj[0][key] === undefined) return ris
	obj.forEach((elem) => {
		const risElem = ris.find((_) => _[key] === elem[key])
		if (risElem === undefined) {
			const toPush = {}
			toPush[key] = elem[key]
			toPush[listName] = [elem]
			ris.push(toPush)
		} else risElem[listName].push(elem)
	})
	return ris
}

function searchDate(members_par, archetype, allsets) {
	let ris = "NONE"
	let members = members_par
		.filter(
			(_) =>
				!_.desc.includes(
					`This card is always treated as a "${archetype}"`
				) &&
				!_.desc.includes(
					`This card is always treated as an "${archetype}"`
				)
		)
		.filter(
			(_) =>
				_.desc.includes(`"${archetype}" card`) ||
				_.desc.includes(`"${archetype}" monster`) ||
				_.desc.includes(`"${archetype}" Spell`) ||
				_.desc.includes(`"${archetype}" Trap`)
		)
	if (members.length === 0) {
		members = members_par.filter((_) => _.name !== archetype)
	}
	for (let i = 0; i < members.length; i++) {
		if (members[i].card_sets === undefined) {
			continue
		}
		for (let j = 0; j < members[i].card_sets.length; j++) {
			const target_set = members[i].card_sets[j].set_name
			const cmp = allsets.filter((x) => x.set_name === target_set)[0]
			if (ris === "") ris = cmp.tcg_date + " " + cmp.set_name
			else if (cmp !== undefined && cmp.tcg_date < ris)
				ris =
					cmp.tcg_date + " " + cmp.set_name + " | " + members[i].name
		}
	}
	return ris
}

function arcAttr(arc) {
	const ris = []
	arc.forEach((monster) => {
		if (monster.attribute === undefined) return
		if (!ris.includes(monster.attribute)) ris.push(monster?.attribute)
	})
	if (ris.length === 0) {
		if (arc.filter((_) => _.type.includes("Spell").length > 0))
			ris.push("SPELL")
		if (arc.filter((_) => _.type.includes("Trap").length > 0))
			ris.push("TRAP")
	}
	return ris
}

function arcType(arc) {
	const ris = []
	arc.forEach((monster) => {
		if (monster.race === undefined) return
		if (!ris.includes(monster.race)) ris.push(monster.race)
	})
	return ris
}

function arcFocus(arc) {
	/*
    Ritual
    Fusion
    Synchro
    Xyz
    Pendulum
    Link
    */
	const focus = [
		"No Extra",
		"Ritual",
		"Fusion",
		"Synchro",
		"Xyz",
		"Pendulum",
		"Link",
	]
	const ris = {}
	focus.forEach((key) => (ris[key] = 0))
	arc.filter((_) => _.type.includes("Monster")).forEach((monster) => {
		focus.forEach((key) => {
			if (monster.type.toUpperCase().includes(key.toUpperCase()))
				ris[key] += 1
		})
		if (
			!monster.type.includes("Ritual") &&
			!monster.type.includes("Fusion") &&
			!monster.type.includes("Synchro") &&
			!monster.type.includes("XYZ") &&
			!monster.type.includes("Pendulum") &&
			!monster.type.includes("Link")
		)
			ris["No Extra"] += 1
	})

	return ris
}

export function retrieveArchetypes(allcards, allsets) {
	const grouped = groupBy(
		allcards.filter((_) => _.archetype !== undefined),
		"archetype",
		"members"
	)

	grouped.forEach((arc) => {
		allcards
			.filter(
				(_) =>
					_.archetype !== arc.archetype &&
					(_.desc.includes('"' + arc.archetype + '"') ||
						_.name.includes(arc.archetype)) &&
					!_.desc.includes(
						`This card is not treated as a "${arc.archetype}"`
					) &&
					!_.desc.includes(
						`This card is not treated as an "${arc.archetype}"`
					)
			)
			.forEach((member) => {
				if (!arc.members.includes(member)) arc.members.push(member)
			})

		arc.true_name = arc.archetype
	})

	grouped.forEach((arc) => {
		exceptionArc(arc, allcards, grouped)
		arc.date = searchDate(arc.members, arc.archetype, allsets)
	})

	grouped.forEach((arc) => {
		const arcPic = archetypesPics.find((x) => x.arc === arc.archetype)
		if (arcPic === undefined) arc.imgs = { Poster: undefined }
		else {
			if (arcPic.imgs === undefined) arc.imgs = { Poster: arcPic.url }
			else arc.imgs = arcPic.imgs
			if (arcPic.crest !== undefined) arc.crest = arcPic.crest
		}

		arc.attributes = arcAttr(arc.members)
		arc.types = arcType(arc.members)

		arc.focus = arcFocus(arc.members)
		// arc["members"] = arc["members"].length;
	})

	grouped.sort((a, b) => (a.date > b.date ? -1 : 1))

	return grouped
		.filter((_) => !archetypesBlacklist.includes(_.archetype))
		.map((_) => {
			const obj = {
				archetype: _.archetype,
				members: _.members.length,
				true_name: _.true_name,
				date: _.date,
				imgs: _.imgs,
				attributes: _.attributes,
				types: _.types,
				crest: _?.crest,
				focus: _.focus,
			}
			return obj
		})
}
