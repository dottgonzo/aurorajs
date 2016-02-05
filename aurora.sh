#! /bin/bash

export PATH=/opt/bin:/usr/local/bin:/usr/contrib/bin:/bin:/usr/bin:/sbin:/usr/sbin


while getopts a:t: option
do
	case $option
		in

		a) addrs=$OPTARG;;
		t) timezone=$OPTARG;;


	esac
done



if [[ $addrs ]];then

	c=0
	for ads in $(echo $addrs|sed 's/},{/ /g'); do

		uuid=$(echo $ads|sed 's/,/ /g'|awk '{print($1)}'|sed 's/:/ /g'|sed 's/\[//g' |sed 's/]//g'|sed 's/{//g'|sed 's/}//g'|awk '{print($2)}'|sed 's/"//g')
		addr=$(echo $ads|sed 's/,/ /g'|awk '{print($3)}'|sed 's/:/ /g'|sed 's/\[//g' |sed 's/]//g'|sed 's/{//g'|sed 's/}//g'|awk '{print($2)}'|sed 's/"//g')
		dev=$(echo $ads|sed 's/,/ /g'|awk '{print($2)}'|sed 's/:/ /g'|sed 's/\[//g' |sed 's/]//g'|sed 's/{//g'|sed 's/}//g'|awk '{print($2)}'|sed 's/"//g')


		usb=0
		for sysdevpath in $(find /sys/bus/usb/devices/usb*/ -name dev); do

			syspath="${sysdevpath%/dev}"
			devname="$(udevadm info -q name -p $syspath)"
			vendor=$(udevadm info -p $syspath -q all |grep "ID_VENDOR_ID" |sed 's/ID_VENDOR_ID=//g'|awk '{print($2)}')
			model=$(udevadm info -p $syspath -q all |grep "ID_MODEL_ID" |sed 's/ID_MODEL_ID=//g'|awk '{print($2)}')

			#udevadm info -p $syspath -q all


			[[ "$devname" == "bus/"* ]] && continue
			eval "$(udevadm info -q property --export -p $syspath)"
			[[ -z "$ID_SERIAL" ]] && continue
			if [[ $(echo /dev/$devname|grep -v hidraw|grep -v '/dev/usb' | grep -c '' ) > 0 ]];then
				hub=$(echo $syspath | sed 's/\/sys\/bus\/usb\/devices\/usb//g' | sed 's/\// /g'| awk '{print($3)}')

hubsplit=$(echo $hub|sed 's/:/ /g'|awk {'print($1)'})

				if [[ ($hub == $dev || $hubsplit == $dev) && $(echo $devname | sed 's/ty/ /g'|wc -w)>1 ]];then

					dev="/dev/$devname"
					usb=1
				fi

			fi


		done

		datetimex=$(date +%s%3N)
		boot_id=$(cat /proc/sys/kernel/random/boot_id)


		if [[ $usb != 0 || $addr == 0 ]];then



			if [[ $addr == 0 ]]; then


				getpower='20151016-17:48:05   322.780518       0.634460     204.791473     372.630310       0.330505     123.156319     230.717117       0.640320     353.191254      49.972015     107.697403      36.644943      37.243713       35.713       35.713        0.000       83.563     1433.713    22685.663    22685.663    OK'
				getdsp=' 589.707397   296.786133     0.000000     0.000000   593.467346     0.000000     0.000000     3.915176   230.570648   231.606934     0.000000    49.968021  10537.008789  6398.122070     0.000000     0.000000     0.000000     0.000000     0.000000     0.000000     0.000000     0.000000     0.000000     0.000000     0.000000   222.698486   140.068283     0.000000     0.000000     0.000000     0.000000    OK'

			elif [[ $dev && $addr ]]; then
				getdsp=$(aurora -D -c -Y 20 -a $addr $dev)
				sleep 10
				getpower=$(aurora -a $addr -T -c -d 0 -e -Y 20 $dev) #dopo 20 secondi!!
				sleep 10

			fi


			if [[ $(echo $getpower | wc -w) == 22 && $(echo $getdsp | wc -w) == 32 &&$(echo $getpower | awk '{print($22)}') == 'OK' ]]; then

				date=$(echo $getpower | awk '{print($1)}')
				year=${date:0:4}
				month=${date:4:2}
				day=${date:6:2}
				clock=${date:9:8}

				datetime=$(TZ=$(echo $timezone) date +%s%3N -d "${year}-${month}-${day} ${clock}")


				if [[ $(echo $getdsp | awk '{print($3)}') != '0.000000' ]]; then
					add=',"bulkPlusCV":'$(echo $getdsp | awk '{print($3)}')
				fi
				if [[ $(echo $getdsp | awk '{print($4)}') != '0.000000' ]]; then
					add=$add',"bulkMinusCV":'$(echo $getdsp | awk '{print($4)}')
				fi

				if [[ $(echo $getdsp | awk '{print($6)}') != '0.000000' ]]; then
					add=$add',"leakDC":'$(echo $getdsp | awk '{print($6)}')
				fi
				if [[ $(echo $getdsp | awk '{print($7)}') != '0.000000' ]]; then
					add=$add',"leakC":'$(echo $getdsp | awk '{print($7)}')
				fi

				if [[ $(echo $getdsp | awk '{print($11)}') != '0.000000' ]]; then
					add=$add',"gridNV":'$(echo $getdsp | awk '{print($11)}')
				fi

				if [[ $(echo $getdsp | awk '{print($15)}') != '0.000000' ]]; then
					',"tempSupC":'$(echo $getdsp | awk '{print($15)}')
				fi
				if [[ $(echo $getdsp | awk '{print($16)}') != '0.000000' ]]; then
					',"tempAlimC":'$(echo $getdsp | awk '{print($16)}')
				fi
				if [[ $(echo $getdsp | awk '{print($17)}') != '0.000000' ]]; then
					add=$add',"TempHeakSinkC":'$(echo $getdsp | awk '{print($17)}')
				fi
				if [[ $(echo $getdsp | awk '{print($18)}') != '0.000000' ]]; then
					add=$add',"temp1":'$(echo $getdsp | awk '{print($18)}')
				fi
				if [[ $(echo $getdsp | awk '{print($19)}') != '0.000000' ]]; then
					add=$add',"temp2":'$(echo $getdsp | awk '{print($19)}')
				fi
				if [[ $(echo $getdsp | awk '{print($20)}') != '0.000000' ]]; then
					add=$add',"temp3":'$(echo $getdsp | awk '{print($20)}')
				fi
				if [[ $(echo $getdsp | awk '{print($21)}') != '0.000000' ]]; then
					add=$add',"fanSpeed1":'$(echo $getdsp | awk '{print($21)}')
				fi
				if [[ $(echo $getdsp | awk '{print($22)}') != '0.000000' ]]; then
					add=$add',"fanSpeed2":'$(echo $getdsp | awk '{print($22)}')
				fi
				if [[ $(echo $getdsp | awk '{print($23)}') != '0.000000' ]]; then
					add=$add',"fanSpeed3":'$(echo $getdsp | awk '{print($23)}')
				fi
				if [[ $(echo $getdsp | awk '{print($24)}') != '0.000000' ]]; then
					add=$add',"fanSpeed4":'$(echo $getdsp | awk '{print($24)}')
				fi
				if [[ $(echo $getdsp | awk '{print($25)}') != '0.000000' ]]; then
					add=$add',"fanSpeed5":'$(echo $getdsp | awk '{print($25)}')
				fi

				if [[ $(echo $getdsp | awk '{print($28)}') != '0.000000' ]]; then
					add=$add',"powerSaturationCW":'$(echo $getdsp | awk '{print($28)}')
				fi
				if [[ $(echo $getdsp | awk '{print($29)}') != '0.000000' ]]; then
					add=$add',"bulkRefRingCV":'$(echo $getdsp | awk '{print($29)}')
				fi
				if [[ $(echo $getdsp | awk '{print($30)}') != '0.000000' ]]; then
					add=$add',"MicroCV":'$(echo $getdsp | awk '{print($30)}')
				fi
				if [[ $(echo $getdsp | awk '{print($30)}') != '0.000000' ]]; then
					add=$add',"windGenHz":'$(echo $getdsp | awk '{print($31)}')
				fi


				inv=$(echo -n '{'\
				'"_id":"data_'$uuid'_'$datetime'",'\
				'"uid":"'$uuid'",'\
				'"bootId":"'$boot_id'",'\
				'"bootTime":'$(cat /proc/stat | grep btime | awk '{ print $2 }')'000,'\
				'"active":true,'\
				'"updatedAt":'$datetime','\
				'"date":"'$(echo $getpower | awk '{print($1)}')'",'\
				'"strings":[{'\
				'"voltage":'$(echo $getpower | awk '{print($2)}')','\
				'"current":'$(echo $getpower | awk '{print($3)}')','\
				'"power":'$(echo $getpower | awk '{print($4)}')''\
				'},{'\
				'"voltage":'$(echo $getpower | awk '{print($5)}')','\
				'"current":'$(echo $getpower | awk '{print($6)}')','\
				'"power":'$(echo $getpower | awk '{print($7)}')\
				'}],'\
				'"grid":{'\
				'"voltage":'$(echo $getpower | awk '{print($8)}')','\
				'"current":'$(echo $getpower | awk '{print($9)}')','\
				'"power":'$(echo $getpower | awk '{print($10)}')','\
				'"hz":'$(echo $getpower | awk '{print($11)}')\
				'},'\
				'"DcAcCvrEff":'$(echo $getpower | awk '{print($12)}')','\
				'"invTemp":'$(echo $getpower | awk '{print($13)}')','\
				'"envTemp":'$(echo $getpower | awk '{print($14)}')','\
				'"dailyEnergy":'$(echo $getpower | awk '{print($15)}')','\
				'"weeklyEnergy":'$(echo $getpower | awk '{print($16)}')','\
				'"last7DaysEnergy":'$(echo $getpower | awk '{print($17)}')','\
				'"monthlyEnergy":'$(echo $getpower | awk '{print($18)}')','\
				'"yearlyEnergy":'$(echo $getpower | awk '{print($19)}')','\
				'"totalEnergy":'$(echo $getpower | awk '{print($20)}')','\
				'"partialEnergy":'$(echo $getpower | awk '{print($21)}')','\
				'"bulkV":'$(echo $getdsp | awk '{print($1)}')','\
				'"bulkMV":'$(echo $getdsp | awk '{print($2)}')','\
				'"bulkDC":'$(echo $getdsp | awk '{print($5)}')','\
				'"isoRes":'$(echo $getdsp | awk '{print($8)}')','\
				'"gridVDC":'$(echo $getdsp | awk '{print($9)}')','\
				'"gridAvgV":'$(echo $getdsp | awk '{print($10)}')','\
				'"gridDCHz":'$(echo $getdsp | awk '{print($12)}')','\
				'"peakMax":'$(echo $getdsp | awk '{print($13)}')','\
				'"peakDay":'$(echo $getdsp | awk '{print($14)}')','\
				'"pin1W":'$(echo $getdsp | awk '{print($26)}')','\
				'"pin2W":'$(echo $getdsp | awk '{print($27)}')$add\
				'}')


			else
				inv='{"uid":"'$uuid'","bootId":"'$boot_id'","active":false,"deviceTime":'$datetimex'}'
			fi


		else
			inv='{"uid":"'$uuid'","bootId":"'$boot_id'","active":false,"deviceTime":'$datetimex'}'
		fi

		if [[ $c == 0 ]]; then
			invs="$inv"
		else
			invs="$invs,$inv"
		fi


		c=$(( $c + 1 ))

	done


	echo -n "[$invs]"

else
	getpower="no"
	getdsp="no"
	exit 1
fi
